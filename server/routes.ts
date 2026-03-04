import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuthorSchema, insertCategorySchema, insertTagSchema, insertPostSchema, insertBannerSchema, insertFreeMaterialSchema, insertCommentSchema, insertImageGroupSchema, insertImageBankItemSchema, insertContainerRuleSchema, insertMediaSchema, postCategories, postTags } from "@shared/schema";
import { db } from "./db";
import { crawlMultipleUrls } from "./crawler";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido"));
    }
  },
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", (await import("express")).default.static(uploadsDir));

  app.post("/api/admin/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const mediaItem = await storage.createMedia({
      filename: req.file.originalname,
      url: fileUrl,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      source: "upload",
    });
    res.json({ url: fileUrl, filename: req.file.originalname, mediaId: mediaItem.id });
  });

  app.get("/api/admin/media", isAuthenticated, async (req, res) => {
    const { search, page, limit, sort } = req.query;
    const result = await storage.listMedia({
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 30,
      sort: sort as string,
    });
    res.json(result);
  });

  app.get("/api/admin/media/stats", isAuthenticated, async (_req, res) => {
    const stats = await storage.getMediaStats();
    res.json(stats);
  });

  app.get("/api/admin/media/duplicates", isAuthenticated, async (_req, res) => {
    const duplicates = await storage.findDuplicateMedia();
    res.json(duplicates);
  });

  app.get("/api/admin/media/:id/usage", isAuthenticated, async (req, res) => {
    const usages = await storage.getMediaUsage(parseInt(req.params.id));
    res.json(usages);
  });

  app.post("/api/admin/media", isAuthenticated, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const mediaItem = await storage.createMedia({
      filename: req.file.originalname,
      url: fileUrl,
      altText: req.body.altText || null,
      title: req.body.title || null,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      source: "upload",
    });
    res.json(mediaItem);
  });

  app.delete("/api/admin/media/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const force = req.query.force === "true";

    if (!force) {
      const usages = await storage.getMediaUsage(id);
      if (usages.length > 0) {
        return res.json({ requiresConfirmation: true, usages });
      }
    }

    const media = await storage.getMedia(id);
    if (media && media.url.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, path.basename(media.url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const deleted = await storage.deleteMedia(id);
    res.json({ deleted });
  });

  app.post("/api/admin/media/refresh-sizes", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getMediaWithNullFileSize(200);
      let updated = 0;
      for (const item of items) {
        try {
          if (item.url.startsWith("/uploads/")) {
            const filePath = path.join(uploadsDir, path.basename(item.url));
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              await storage.updateMediaFileSize(item.id, stat.size);
              updated++;
            }
          } else {
            const response = await fetch(item.url, { method: "HEAD", signal: (AbortSignal as any).timeout(5000) });
            const size = response.headers.get("content-length");
            if (size) {
              await storage.updateMediaFileSize(item.id, parseInt(size));
              updated++;
            }
          }
        } catch (e) {
          console.error(`Failed to get size for ${item.url}:`, e);
        }
      }
      const remainingItems = await storage.getMediaWithNullFileSize(1);
      res.json({ updated, remaining: remainingItems.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/media/unify", isAuthenticated, async (req, res) => {
    try {
      const { keepId, removeId } = req.body;
      const keepMedia = await storage.getMedia(keepId);
      const removeMedia = await storage.getMedia(removeId);

      if (!keepMedia || !removeMedia) {
        return res.status(404).json({ message: "Mídia não encontrada" });
      }

      const updatedCount = await storage.unifyMediaInPosts(keepMedia.url, removeMedia.url);
      
      // If it was an upload, delete the file
      if (removeMedia.url.startsWith("/uploads/")) {
        const filePath = path.join(uploadsDir, path.basename(removeMedia.url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await storage.deleteMedia(removeId);
      res.json({ success: true, updatedPosts: updatedCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/media/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { filename } = req.body;
      if (filename !== undefined) {
        const trimmed = (filename || "").trim();
        if (!trimmed) {
          return res.status(400).json({ message: "Nome do arquivo não pode ser vazio" });
        }
        const existing = await storage.getMediaByFilename(trimmed, id);
        if (existing) {
          return res.status(409).json({ message: `A imagem "${trimmed}" já existe` });
        }
        await storage.updateMediaFilename(id, trimmed);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/media/import-from-posts", isAuthenticated, async (_req, res) => {
    try {
      const allPosts = await storage.getPosts({ limit: 1000 });
      const seenUrls = new Set<string>();
      const toInsert: { url: string; filename: string; altText?: string; source: string; fileSize?: number }[] = [];

      for (const post of allPosts) {
        if (post.featuredImage && !seenUrls.has(post.featuredImage)) {
          seenUrls.add(post.featuredImage);
          const urlParts = post.featuredImage.split("/");
          const filename = decodeURIComponent(urlParts[urlParts.length - 1] || "unknown");
          toInsert.push({ url: post.featuredImage, filename, source: "wordpress" });
        }

        if (post.content) {
          const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
          let match;
          while ((match = imgRegex.exec(post.content)) !== null) {
            const src = match[1];
            if (src && !seenUrls.has(src)) {
              seenUrls.add(src);
              const urlParts = src.split("/");
              const filename = decodeURIComponent(urlParts[urlParts.length - 1] || "unknown");
              const altText = match[2] || null;
              toInsert.push({ url: src, filename, altText: altText || undefined, source: "post-content" });
            }
          }
        }
      }

      const existing = await storage.listMedia({ limit: 100000 });
      const existingUrls = new Set(existing.items.map(m => m.url));
      const newItems = toInsert.filter(i => !existingUrls.has(i.url));

      let imported = 0;
      for (const item of newItems) {
        let fileSize: number | undefined;
        try {
          const response = await fetch(item.url, { method: "HEAD", timeout: 2000 } as any);
          const size = response.headers.get("content-length");
          if (size) fileSize = parseInt(size);
        } catch (e) {
          // ignore size fetch error
        }

        await storage.createMedia({
          filename: item.filename,
          url: item.url,
          altText: item.altText || null,
          source: item.source,
          fileSize: fileSize || null,
        });
        imported++;
      }

      res.json({ imported, total: toInsert.length, alreadyExisted: toInsert.length - imported });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/media/migrate-images", isAuthenticated, async (req, res) => {
    req.setTimeout(600000);
    res.setTimeout(600000);
    try {
      const WP_PREFIX = "https://www.blog.psicometriaonline.com.br/wp-content/uploads/";
      const WP_REGEX = new RegExp(WP_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\'<>\\s,]+', 'g');
      const SIZE_VARIANT_RE = /(-\d+x\d+)(\.\w+)$/;

      const allPosts = await storage.getPosts({ limit: 10000 });

      const allWpUrls = new Set<string>();
      for (const post of allPosts) {
        if (post.featuredImage && post.featuredImage.startsWith(WP_PREFIX)) {
          allWpUrls.add(post.featuredImage);
        }
        if (post.content) {
          let match;
          WP_REGEX.lastIndex = 0;
          while ((match = WP_REGEX.exec(post.content)) !== null) {
            allWpUrls.add(match[0]);
          }
        }
      }

      const originalUrls = new Set<string>();
      const variantToOriginal: Record<string, string> = {};

      for (const url of allWpUrls) {
        const sizeMatch = url.match(SIZE_VARIANT_RE);
        if (sizeMatch) {
          const originalUrl = url.replace(SIZE_VARIANT_RE, '$2');
          variantToOriginal[url] = originalUrl;
          originalUrls.add(originalUrl);
        } else {
          originalUrls.add(url);
        }
      }

      const originalsToDownload = Array.from(originalUrls);
      const totalOriginals = originalsToDownload.length;
      const totalAllUrls = allWpUrls.size;
      let downloaded = 0;
      let errors = 0;
      const originalToLocal: Record<string, string> = {};

      const BATCH_SIZE = 20;
      for (let i = 0; i < originalsToDownload.length; i += BATCH_SIZE) {
        const batch = originalsToDownload.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (remoteUrl) => {
          try {
            const urlPath = remoteUrl.replace(WP_PREFIX, "");
            const originalFilename = decodeURIComponent(urlPath.split("/").pop() || "unknown");
            const dateFolder = urlPath.split("/").slice(0, 2).join("-");
            const localFilename = `${dateFolder}_${originalFilename}`;
            const localPath = path.join(uploadsDir, localFilename);

            if (fs.existsSync(localPath)) {
              originalToLocal[remoteUrl] = `/uploads/${localFilename}`;
              downloaded++;
              return;
            }

            const response = await fetch(remoteUrl, {
              signal: (AbortSignal as any).timeout(30000),
            });

            if (!response.ok) {
              console.error(`Migration: HTTP ${response.status} for ${remoteUrl}`);
              errors++;
              return;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(localPath, buffer);
            originalToLocal[remoteUrl] = `/uploads/${localFilename}`;
            downloaded++;
          } catch (e: any) {
            console.error(`Migration: Failed to download ${remoteUrl}:`, e.message);
            errors++;
          }
        }));

        if (i + BATCH_SIZE < originalsToDownload.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const fullMapping: Record<string, string> = {};
      for (const [url, localPath] of Object.entries(originalToLocal)) {
        fullMapping[url] = localPath;
      }
      for (const [variantUrl, originalUrl] of Object.entries(variantToOriginal)) {
        if (originalToLocal[originalUrl]) {
          fullMapping[variantUrl] = originalToLocal[originalUrl];
        }
      }

      let postsUpdated = 0;
      let srcsetsStripped = 0;
      for (const post of allPosts) {
        let newFeatured = post.featuredImage;
        let newContent = post.content;
        let changed = false;

        if (newFeatured && fullMapping[newFeatured]) {
          newFeatured = fullMapping[newFeatured];
          changed = true;
        }

        if (newContent) {
          for (const [oldUrl, newUrl] of Object.entries(fullMapping)) {
            if (newContent.includes(oldUrl)) {
              newContent = newContent.split(oldUrl).join(newUrl);
              changed = true;
            }
          }

          const beforeSrcset = newContent;
          newContent = newContent.replace(/\s*srcset="[^"]*"/gi, "");
          newContent = newContent.replace(/\s*sizes="[^"]*"/gi, "");
          if (newContent !== beforeSrcset) {
            changed = true;
            srcsetsStripped++;
          }
        }

        if (changed) {
          await storage.updatePost(post.id, {
            featuredImage: newFeatured,
            content: newContent,
          });
          postsUpdated++;
        }
      }

      const mediaItems = await storage.listMedia({ limit: 100000 });
      let mediaUpdated = 0;
      for (const item of mediaItems.items) {
        if (item.url.startsWith(WP_PREFIX)) {
          const localUrl = fullMapping[item.url];
          if (localUrl) {
            const filePath = path.join(uploadsDir, localUrl.replace("/uploads/", ""));
            const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : undefined;
            await storage.updateMediaUrl(item.id, localUrl, fileSize);
            mediaUpdated++;
          }
        }
      }

      res.json({
        totalUrls: totalAllUrls,
        totalOriginals,
        downloaded,
        errors,
        postsUpdated,
        srcsetsStripped,
        mediaUpdated,
      });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PUBLIC ROUTES =====

  app.get("/api/menu", async (_req, res) => {
    try {
      const menuJson = await storage.getSetting("menu_items");
      if (menuJson) {
        res.json(JSON.parse(menuJson));
      } else {
        res.json([]);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/home", async (_req, res) => {
    try {
      const data = await storage.getHomePageData();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = (req.query.status as string) || "published";
      const posts = await storage.getPosts({ status, limit, offset });
      const total = await storage.getPostCount(status);
      res.json({ posts, total, limit, offset });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const searchIn = (req.query.searchIn as string) || "all";
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const tagId = req.query.tagId ? parseInt(req.query.tagId as string) : undefined;
      const dateFrom = (req.query.dateFrom as string) || undefined;
      const dateTo = (req.query.dateTo as string) || undefined;
      const sort = (req.query.sort as string) || "relevance";
      if (!query) return res.json({ posts: [], total: 0, limit, offset });
      const searchOptions = { limit, offset, searchIn, categoryId, tagId, dateFrom, dateTo, sort };
      const posts = await storage.searchPosts(query, searchOptions);
      const total = await storage.searchPostCount(query, { searchIn, categoryId, tagId, dateFrom, dateTo });
      res.json({ posts, total, limit, offset });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/slug/:slug", async (req, res) => {
    try {
      const post = await storage.getPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      storage.incrementViewCount(post.id).catch(() => {});
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(parseInt(req.params.id));
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/materials", async (_req, res) => {
    try {
      const materials = await storage.getFreeMaterials();
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/categories/slug/:slug", async (req, res) => {
    try {
      const cat = await storage.getCategoryBySlug(req.params.slug);
      if (!cat) return res.status(404).json({ message: "Category not found" });
      res.json(cat);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/categories/:slug/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPostsByCategory(req.params.slug, { limit, offset });
      const total = await storage.getPostCountByCategory(req.params.slug);
      const category = await storage.getCategoryBySlug(req.params.slug);
      res.json({ posts, total, limit, offset, category });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tags", async (_req, res) => {
    try {
      const allTags = await storage.getTags();
      res.json(allTags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tags/:slug/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPostsByTag(req.params.slug, { limit, offset });
      const total = await storage.getPostCountByTag(req.params.slug);
      const tag = await storage.getTagBySlug(req.params.slug);
      res.json({ posts, total, limit, offset, tag });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/authors", async (_req, res) => {
    try {
      const allAuthors = await storage.getAuthors();
      res.json(allAuthors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/banners", async (req, res) => {
    try {
      const slot = req.query.slot as string | undefined;
      const all = await storage.getBanners(slot);
      res.json(all.filter(b => b.isActive));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id/most-read-category", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const categoryId = parseInt(req.query.categoryId as string);
      if (!categoryId) return res.json([]);
      const mostRead = await storage.getMostReadByCategory(categoryId, postId, 3);
      res.json(mostRead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const cmts = await storage.getCommentsByPost(postId);
      res.json(cmts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const parsed = insertCommentSchema.parse({ ...req.body, postId });
      const comment = await storage.createComment(parsed);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/media/fix-citations", isAuthenticated, async (_req, res) => {
    try {
      const allPosts = await storage.getPosts({ limit: 10000 });
      let updated = 0;
      
      const properNouns = [
        "Pearson", "Spearman", "Kendall", "Fisher", "Cronbach", "Cohen", "Shapiro", "Wilk", "Levene", "Kolmogorov", "Smirnov", "Kruskal", "Wallis", "Mann", "Whitney", "Welch", "Friedman", "Bonferroni", "Tukey", "Scheffe", "Dunn", "Holm", "Bayes", "Bayesiana", "Bayesiano", "Likert", "Guttman", "Rasch", "Thurstone", "Kuder", "Richardson", "ANOVA", "MANOVA", "ANCOVA", "MANCOVA", "JASP", "SPSS", "RStudio", "FACTOR", "R", "ggplot2", "Python", "Excel", "Stata", "SAS", "jamovi", "APA", "IEEE", "McDonald", "Mardia", "Mauchly", "Bartlett", "Student", "Glass", "Hedges", "Bonett", "Satterthwaite", "Box", "Duncan", "Dunnett", "Kaiser", "Meyer", "Olkin", "Cochran", "Yates", "Geisser", "Greenhouse", "PICO", "TRI", "IRaMuTeQ", "teste F", "V de Cramér", "Bland", "Altman", "Poisson", "PEDro", "Physiotherapy Evidence Database", "Fleiss", "Wilcoxon", "Q de Cochran", "U de Mann-Whitney", "SRMR", "RMSEA", "GLMs", "R²", "AMSTAR", "Tipo I", "Tipo II", "Cook", "Curva ROC", "FWER", "EndNote", "Mendeley", "Zotero", "PROCESS", "MIMIC", "HARKing", "SciELO", "Google Acadêmico", "Periódicos CAPES", "Qualis CAPES", "PRISMA", "G*Power", "E-book Análises Bi e Multivariadas: Definições e Usos", "Bessel", "Benjamini-Hochberg", "IA", "SVM", "Goodman-Kruskal", "Yuen", "KR-20", "KR-21", "Q-Q", "Markov", "Matthews", "XGBoost", "Wald-Wolfowitz", "Psicometria Online Academy"
      ].sort((a, b) => b.length - a.length);

      for (const post of allPosts) {
        if (!post.content) continue;
        let content = post.content;
        let postUpdated = false;

        // Pattern 1: Convert raw "Como citar" to citation-box if not already converted
        if (!content.includes('class="citation-box"')) {
          const citationRegex = /(<h2[^>]*>(?:\s*<[^>]+>)*\s*Como\s+citar\s*(?:<\/[^>]+>\s*)*<\/h2>\s*)(<p[^>]*>)([\s\S]*?)(<\/p>)/i;
          const match = content.match(citationRegex);
          if (match) {
            const heading = match[1];
            const pOpen = match[2];
            const pContent = match[3];
            const pClose = match[4];
            const replacement = `${heading}<div class="citation-box">${pOpen}${pContent}${pClose}</div>`;
            content = content.replace(match[0], replacement);
            postUpdated = true;
          }
        }

        // Pattern 2: Fix capitalization inside citation-box
        const citationBoxRegex = /<div class="citation-box">([\s\S]*?)<\/div>/g;
        content = content.replace(citationBoxRegex, (match, citationInner) => {
          let fixedInner = citationInner;
          
          // Try to use the post title as a reference for the title part of the citation
          const titleMatch = fixedInner.match(/\)\.\s+(.*?)\s+<em>/i);
          if (titleMatch && post.title) {
            const citationTitle = titleMatch[1];
            const dbTitleClean = post.title.trim().replace(/\?$/, '');
            const citTitleClean = citationTitle.trim().replace(/\.$/, '').replace(/\?$/, '');
            
            if (dbTitleClean.toLowerCase() === citTitleClean.toLowerCase()) {
              const suffix = citationTitle.endsWith('?') ? '?' : '.';
              fixedInner = fixedInner.replace(citationTitle, dbTitleClean + suffix);
            }
          }

          for (const noun of properNouns) {
            const escaped = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?<![a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])${escaped}(?![a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])`, 'gi');
            fixedInner = fixedInner.replace(regex, noun);
          }
          
          if (fixedInner !== citationInner) {
            postUpdated = true;
            return `<div class="citation-box">${fixedInner}</div>`;
          }
          return match;
        });

        if (postUpdated) {
          await storage.updatePost(post.id, { content });
          updated++;
        }
      }
      res.json({ updated, total: allPosts.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ADMIN ROUTES (Protected) =====

  app.get("/api/admin/posts", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const posts = await storage.getPosts({ status, limit, offset, search });
      const total = await storage.getPostCount(status, search);
      res.json({ posts, total, limit, offset });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/posts/check-keyword", isAuthenticated, async (req, res) => {
    try {
      const keyword = (req.query.keyword as string || "").trim().toLowerCase();
      const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;
      if (!keyword) return res.json({ used: false, postTitle: null });

      const allPosts = await storage.getPosts({ limit: 1000, offset: 0 });
      const match = allPosts.find(p =>
        p.focusKeyword && p.focusKeyword.toLowerCase() === keyword && p.id !== excludeId
      );
      res.json({ used: !!match, postTitle: match?.title || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/posts", isAuthenticated, async (req, res) => {
    try {
      const { categoryIds, tagIds, ...postData } = req.body;
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({ message: "Você precisa definir pelo menos uma categoria para salvar o post." });
      }
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ message: "Você precisa definir pelo menos uma tag para salvar o post." });
      }
      if (postData.publishedAt) {
        postData.publishedAt = new Date(postData.publishedAt);
      }
      const parsed = insertPostSchema.parse(postData);
      const post = await storage.createPost(parsed, categoryIds, tagIds);
      res.status(201).json(post);
    } catch (error: any) {
      console.error("Error creating post:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const { categoryIds, tagIds, ...postData } = req.body;
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({ message: "Você precisa definir pelo menos uma categoria para salvar o post." });
      }
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ message: "Você precisa definir pelo menos uma tag para salvar o post." });
      }
      if (postData.publishedAt) {
        postData.publishedAt = new Date(postData.publishedAt);
      }
      const post = await storage.updatePost(parseInt(req.params.id), postData, categoryIds, tagIds);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const cats = await storage.getCategories();
      for (const c of cats) {
        if (c.slug === "indefinida") {
          const cnt = await storage.countPostsInCategory(c.id);
          if (cnt === 0) await storage.deleteCategory(c.id);
        }
      }
      const allTags = await storage.getTags();
      for (const t of allTags) {
        if (t.slug === "indefinida") {
          const cnt = await storage.countPostsInTag(t.id);
          if (cnt === 0) await storage.deleteTag(t.id);
        }
      }

      res.json(post);
    } catch (error: any) {
      console.error("Error updating post:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deletePost(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Post not found" });
      res.json({ message: "Post deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/categories", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCategorySchema.parse(req.body);
      const cat = await storage.createCategory(parsed);
      res.status(201).json(cat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const cat = await storage.updateCategory(parseInt(req.params.id), req.body);
      if (!cat) return res.status(404).json({ message: "Category not found" });
      res.json(cat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const postsWithOnlyThis = await storage.getPostsWithOnlyCategory(categoryId);
      if (postsWithOnlyThis.length > 0) {
        let fallback = await storage.getCategoryBySlug("indefinida");
        if (!fallback) {
          fallback = await storage.createCategory({ name: "Indefinida", slug: "indefinida" });
        }
        for (const postId of postsWithOnlyThis) {
          await db.insert(postCategories).values({ postId, categoryId: fallback.id }).onConflictDoNothing();
        }
      }
      const success = await storage.deleteCategory(categoryId);
      if (!success) return res.status(404).json({ message: "Category not found" });

      // After deleting a category, check if any OTHER category (like Indefinida) became empty
      const categoriesList = await storage.getCategories();
      for (const cat of categoriesList) {
        if (cat.slug === "indefinida") {
          const postCount = await storage.countPostsInCategory(cat.id);
          if (postCount === 0) {
            await storage.deleteCategory(cat.id);
          }
        }
      }
      res.json({ message: "Category deleted", reassigned: postsWithOnlyThis.length });

    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/tags", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(parsed);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/tags/:id", isAuthenticated, async (req, res) => {
    try {
      const tag = await storage.updateTag(parseInt(req.params.id), req.body);
      if (!tag) return res.status(404).json({ message: "Tag not found" });
      res.json(tag);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/tags/:id", isAuthenticated, async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const postsWithOnlyThis = await storage.getPostsWithOnlyTag(tagId);
      if (postsWithOnlyThis.length > 0) {
        let fallback = await storage.getTagBySlug("indefinida");
        if (!fallback) {
          fallback = await storage.createTag({ name: "Indefinida", slug: "indefinida" });
        }
        for (const postId of postsWithOnlyThis) {
          await db.insert(postTags).values({ postId, tagId: fallback.id }).onConflictDoNothing();
        }
      }
      const success = await storage.deleteTag(tagId);
      if (!success) return res.status(404).json({ message: "Tag not found" });

      // After deleting a tag, check if any OTHER tag (like Indefinida) became empty
      const tagsList = await storage.getTags();
      for (const t of tagsList) {
        if (t.slug === "indefinida") {
          const postCount = await storage.countPostsInTag(t.id);
          if (postCount === 0) {
            await storage.deleteTag(t.id);
          }
        }
      }
      res.json({ message: "Tag deleted", reassigned: postsWithOnlyThis.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== AUTHOR ROUTES (Protected) =====

  app.post("/api/admin/authors", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertAuthorSchema.parse(req.body);
      const author = await storage.createAuthor(parsed);
      res.status(201).json(author);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/authors/:id", isAuthenticated, async (req, res) => {
    try {
      const author = await storage.updateAuthor(parseInt(req.params.id), req.body);
      if (!author) return res.status(404).json({ message: "Author not found" });
      res.json(author);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/authors/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteAuthor(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Author not found" });
      res.json({ message: "Author deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== BANNER ROUTES (Protected) =====

  app.get("/api/admin/banners", isAuthenticated, async (_req, res) => {
    try {
      const all = await storage.getBanners();
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/banners", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertBannerSchema.parse(req.body);
      const b = await storage.createBanner(parsed);
      res.status(201).json(b);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/banners/:id", isAuthenticated, async (req, res) => {
    try {
      const b = await storage.updateBanner(parseInt(req.params.id), req.body);
      if (!b) return res.status(404).json({ message: "Banner not found" });
      res.json(b);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/banners/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteBanner(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Banner not found" });
      res.json({ message: "Banner deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== FREE MATERIALS ROUTES (Protected) =====

  app.get("/api/admin/materials", isAuthenticated, async (_req, res) => {
    try {
      const all = await storage.getFreeMaterials();
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/materials", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertFreeMaterialSchema.parse(req.body);
      const m = await storage.createFreeMaterial(parsed);
      res.status(201).json(m);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/materials/:id", isAuthenticated, async (req, res) => {
    try {
      const m = await storage.updateFreeMaterial(parseInt(req.params.id), req.body);
      if (!m) return res.status(404).json({ message: "Material not found" });
      res.json(m);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/materials/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteFreeMaterial(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Material not found" });
      res.json({ message: "Material deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CONTAINER MANAGEMENT ROUTES (Protected) =====

  app.get("/api/admin/image-groups", isAuthenticated, async (_req, res) => {
    try {
      const groups = await storage.getImageGroupsWithItems();
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/image-groups", isAuthenticated, async (req, res) => {
    try {
      const data = insertImageGroupSchema.parse(req.body);
      const group = await storage.createImageGroup(data);
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/image-groups/:id", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.updateImageGroup(parseInt(req.params.id), req.body);
      if (!group) return res.status(404).json({ message: "Group not found" });
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/image-groups/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteImageGroup(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Group not found" });
      res.json({ message: "Group deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/image-bank", isAuthenticated, async (req, res) => {
    try {
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
      const items = await storage.getImageBankItems(groupId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/image-bank", isAuthenticated, async (req, res) => {
    try {
      const data = insertImageBankItemSchema.parse(req.body);
      const item = await storage.createImageBankItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/image-bank/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.updateImageBankItem(parseInt(req.params.id), req.body);
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/image-bank/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteImageBankItem(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Item not found" });
      res.json({ message: "Item deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/container-rules", isAuthenticated, async (req, res) => {
    try {
      const containerType = req.query.containerType as string | undefined;
      const rules = await storage.getContainerRules(containerType);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/container-rules", isAuthenticated, async (req, res) => {
    try {
      const data = insertContainerRuleSchema.parse(req.body);
      const rule = await storage.createContainerRule(data);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/container-rules/:id", isAuthenticated, async (req, res) => {
    try {
      const rule = await storage.updateContainerRule(parseInt(req.params.id), req.body);
      if (!rule) return res.status(404).json({ message: "Rule not found" });
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/container-rules/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteContainerRule(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Rule not found" });
      res.json({ message: "Rule deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/container-rules/:id/matching-posts", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getMatchingPostsForRule(parseInt(req.params.id));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id/container-images", async (req, res) => {
    try {
      const results = await storage.getContainerImagesForPost(parseInt(req.params.id));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/media/remove-manual-banners", isAuthenticated, async (req, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    try {
      const dryRun = req.query.dryRun !== "false";
      const result = await storage.removeManualBannersFromPosts(dryRun);
      res.json({ dryRun, ...result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/media/remove-bare-banners", isAuthenticated, async (req, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    try {
      const dryRun = req.query.dryRun !== "false";
      const result = await storage.removeBareBannersFromPosts(dryRun);
      res.json({ dryRun, ...result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SITE SETTINGS ROUTES (Protected) =====

  app.get("/api/admin/settings", isAuthenticated, async (_req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/settings", isAuthenticated, async (req, res) => {
    try {
      const entries = Object.entries(req.body) as [string, string][];
      for (const [key, value] of entries) {
        await storage.setSetting(key, value);
      }
      res.json({ message: "Settings updated" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== ANALYTICS ROUTES (Protected) =====

  app.get("/api/admin/analytics/timeseries", isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      const granularity = (req.query.granularity as string) || "daily";
      const postId = req.query.postId ? parseInt(req.query.postId as string) : undefined;

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date range" });
      }

      let data;
      if (granularity === "hourly") {
        data = await storage.getViewsTimeSeriesHourly(startDate, endDate, postId);
      } else if (granularity === "monthly") {
        data = await storage.getViewsTimeSeriesMonthly(startDate, endDate, postId);
      } else {
        data = await storage.getViewsTimeSeries(startDate, endDate, postId);
      }

      const total = await storage.getTotalViews(startDate, endDate, postId);
      res.json({ data, total });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/posts", isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      const sortDir = (req.query.sort as string) === "asc" ? "asc" as const : "desc" as const;

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date range" });
      }

      const data = await storage.getPostViewsSummary(startDate, endDate, sortDir);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CRAWLING ROUTES (Protected) =====

  app.post("/api/admin/crawl/single", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "Please provide a URL" });
      }

      const { crawlWordPressPost } = await import("./crawler");
      const crawledPost = await crawlWordPressPost(url.trim());

      const categoryIds: number[] = [];
      for (const catName of (crawledPost.categories || [])) {
        const catSlug = slugify(catName);
        let cat = await storage.getCategoryBySlug(catSlug);
        if (!cat) {
          cat = await storage.createCategory({ name: catName, slug: catSlug, description: null });
        }
        categoryIds.push(cat.id);
      }

      const tagIds: number[] = [];
      for (const tagName of (crawledPost.tags || [])) {
        const tagSlug = slugify(tagName);
        let tag = await storage.getTagBySlug(tagSlug);
        if (!tag) {
          tag = await storage.createTag({ name: tagName, slug: tagSlug });
        }
        tagIds.push(tag.id);
      }

      let uniqueSlug = crawledPost.slug;
      const existingPost = await storage.getPostBySlug(uniqueSlug);
      if (existingPost) {
        uniqueSlug = `${uniqueSlug}-${Date.now()}`;
      }

      const post = await storage.createPost({
        title: crawledPost.title,
        slug: uniqueSlug,
        content: crawledPost.content,
        excerpt: crawledPost.excerpt,
        featuredImage: crawledPost.featuredImage,
        authorName: crawledPost.authorName,
        sourceUrl: crawledPost.sourceUrl,
        status: "published",
        publishedAt: crawledPost.publishedAt ? new Date(crawledPost.publishedAt) : new Date(),
      }, categoryIds, tagIds);

      res.json({ success: true, title: crawledPost.title, slug: post.slug, postId: post.id });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/admin/crawl", isAuthenticated, async (req, res) => {
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ message: "Please provide an array of URLs" });
      }

      const result = await crawlMultipleUrls(urls);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/crawl/import", isAuthenticated, async (req, res) => {
    try {
      const { posts: crawledPosts } = req.body;
      if (!crawledPosts || !Array.isArray(crawledPosts)) {
        return res.status(400).json({ message: "Please provide crawled posts to import" });
      }

      const imported = [];
      const errors: { title: string; error: string }[] = [];

      for (const crawledPost of crawledPosts) {
        try {
          const categoryIds: number[] = [];
          for (const catName of (crawledPost.categories || [])) {
            const catSlug = slugify(catName);
            let cat = await storage.getCategoryBySlug(catSlug);
            if (!cat) {
              cat = await storage.createCategory({ name: catName, slug: catSlug, description: null });
            }
            categoryIds.push(cat.id);
          }

          const tagIds: number[] = [];
          for (const tagName of (crawledPost.tags || [])) {
            const tagSlug = slugify(tagName);
            let tag = await storage.getTagBySlug(tagSlug);
            if (!tag) {
              tag = await storage.createTag({ name: tagName, slug: tagSlug });
            }
            tagIds.push(tag.id);
          }

          let uniqueSlug = crawledPost.slug;
          const existingPost = await storage.getPostBySlug(uniqueSlug);
          if (existingPost) {
            uniqueSlug = `${uniqueSlug}-${Date.now()}`;
          }

          const post = await storage.createPost({
            title: crawledPost.title,
            slug: uniqueSlug,
            content: crawledPost.content,
            excerpt: crawledPost.excerpt,
            featuredImage: crawledPost.featuredImage,
            authorName: crawledPost.authorName,
            sourceUrl: crawledPost.sourceUrl,
            status: "published",
            publishedAt: crawledPost.publishedAt ? new Date(crawledPost.publishedAt) : new Date(),
          }, categoryIds, tagIds);

          imported.push(post);
        } catch (err: any) {
          errors.push({ title: crawledPost.title, error: err.message });
        }
      }

      res.json({ imported: imported.length, errors });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
