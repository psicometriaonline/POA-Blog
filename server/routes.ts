import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuthorSchema, insertCategorySchema, insertTagSchema, insertPostSchema, insertBannerSchema, insertFreeMaterialSchema, insertCommentSchema, insertImageGroupSchema, insertImageBankItemSchema, insertContainerRuleSchema, insertMediaSchema, postCategories, postTags, posts, comments, banners, siteSettings } from "@shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";
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

async function migrateBannerSlots() {
  try {
    // Check if migration has already completed
    const migrationFlag = await db.select().from(siteSettings).where(eq(siteSettings.key, "banner_slots_migrated"));
    if (migrationFlag.length > 0) return; // Already migrated, skip
    
    const allBanners = await db.select().from(banners);
    const hasLegacySlots = allBanners.some(b => ["sidebar", "horizontal", "academy_form", "academy_form_listing"].includes(b.slot));
    
    if (!hasLegacySlots) {
      await db.insert(siteSettings).values({ key: "banner_slots_migrated", value: "true" }).onConflictDoUpdate({ target: siteSettings.key, set: { value: "true" } });
      return;
    }

    const legacySidebar = allBanners.filter(b => b.slot === "sidebar").sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id);
    const legacyHorizontal = allBanners.filter(b => b.slot === "horizontal").slice(0, 1);
    const legacyAcademyForm = allBanners.filter(b => b.slot === "academy_form").slice(0, 1);
    const legacyAcademyFormListing = allBanners.filter(b => b.slot === "academy_form_listing").slice(0, 1);

    // Distribute sidebar banners across 3 slots by order (deterministic, one-shot)
    const sidebarSlots = ["home_sidebar_recent_1", "home_sidebar_recent_2", "home_sidebar_categories"];
    for (let i = 0; i < legacySidebar.length && i < sidebarSlots.length; i++) {
      await db.update(banners).set({ slot: sidebarSlots[i] }).where(eq(banners.id, legacySidebar[i].id));
    }

    // Move horizontal to new slot
    if (legacyHorizontal.length > 0) {
      await db.update(banners).set({ slot: "home_horizontal" }).where(eq(banners.id, legacyHorizontal[0].id));
    }

    // Move academy_form to new slot
    if (legacyAcademyForm.length > 0) {
      await db.update(banners).set({ slot: "post_academy_form" }).where(eq(banners.id, legacyAcademyForm[0].id));
    }

    // academy_form_listing: migrate source to category_academy_form, duplicate to tag_academy_form
    if (legacyAcademyFormListing.length > 0) {
      const source = legacyAcademyFormListing[0];
      await db.update(banners).set({ slot: "category_academy_form" }).where(eq(banners.id, source.id));
      
      const existingTag = allBanners.find(b => b.slot === "tag_academy_form");
      if (!existingTag) {
        const { id, ...rest } = source;
        await db.insert(banners).values({ ...rest, slot: "tag_academy_form" });
      }
    }

    // Mark migration as complete
    await db.insert(siteSettings).values({ key: "banner_slots_migrated", value: "true" }).onConflictDoUpdate({ target: siteSettings.key, set: { value: "true" } });
  } catch (err) {
    console.error("Banner slot migration error:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  await migrateBannerSlots();

  setInterval(async () => {
    try {
      const now = new Date();
      const scheduled = await db.select({ id: posts.id }).from(posts)
        .where(and(eq(posts.status, "scheduled"), lte(posts.publishedAt, now)));
      for (const post of scheduled) {
        await db.update(posts).set({ status: "published" }).where(eq(posts.id, post.id));
      }
      if (scheduled.length > 0) {
        console.log(`Auto-published ${scheduled.length} scheduled post(s)`);
      }
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  }, 60000);

  app.get("/uploads/:filename", async (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      return (await import("express")).default.static(uploadsDir)(req, res, next);
    }
    
    const fileUrl = `/uploads/${filename}`;
    const media = await storage.getMediaByUrl(fileUrl);
    
    if (media && media.data) {
      const mimeType = media.mimeType || "application/octet-stream";
      const buffer = Buffer.from(media.data, "base64");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", buffer.length);
      
      fs.writeFileSync(filePath, buffer);
      return res.send(buffer);
    }
    
    return res.status(404).json({ message: "Arquivo não encontrado" });
  });
  
  app.use("/uploads", (await import("express")).default.static(uploadsDir));

  app.post("/api/admin/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileData = fs.readFileSync(req.file.path);
    const encodedData = fileData.toString("base64");
    const mediaItem = await storage.createMedia({
      filename: req.file.originalname,
      url: fileUrl,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      source: "upload",
      data: encodedData,
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
    const fileData = fs.readFileSync(req.file.path);
    const encodedData = fileData.toString("base64");
    const mediaItem = await storage.createMedia({
      filename: req.file.originalname,
      url: fileUrl,
      altText: req.body.altText || null,
      title: req.body.title || null,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      source: "upload",
      data: encodedData,
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
      const { filename, autoSuffix } = req.body;
      if (filename !== undefined) {
        let trimmed = (filename || "").trim();
        if (!trimmed) {
          return res.status(400).json({ message: "Nome do arquivo não pode ser vazio" });
        }
        const existing = await storage.getMediaByFilename(trimmed, id);
        if (existing) {
          if (autoSuffix) {
            const dotIdx = trimmed.lastIndexOf(".");
            const baseName = dotIdx > 0 ? trimmed.substring(0, dotIdx) : trimmed;
            const ext = dotIdx > 0 ? trimmed.substring(dotIdx) : "";
            let suffix = 2;
            let candidate = `${baseName}-${suffix}${ext}`;
            while (await storage.getMediaByFilename(candidate, id)) {
              suffix++;
              candidate = `${baseName}-${suffix}${ext}`;
              if (suffix > 100) {
                return res.status(409).json({ message: `Não foi possível gerar um nome único para "${trimmed}"` });
              }
            }
            trimmed = candidate;
          } else {
            return res.status(409).json({ message: `A imagem "${trimmed}" já existe` });
          }
        }
        await storage.updateMediaFilename(id, trimmed);
        return res.json({ success: true, filename: trimmed });
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

  app.post("/api/admin/media/backfill", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getMediasWithoutData(500);
      let updated = 0;
      
      for (const item of items) {
        try {
          if (item.url.startsWith("/uploads/")) {
            const filePath = path.join(uploadsDir, path.basename(item.url));
            if (fs.existsSync(filePath)) {
              const fileData = fs.readFileSync(filePath);
              await storage.updateMediaData(item.id, fileData);
              updated++;
            }
          }
        } catch (e: any) {
          console.error(`Backfill failed for media ${item.id}:`, e.message);
        }
      }
      
      const remaining = await storage.getMediasWithoutData(1);
      res.json({ updated, remaining: remaining.length });
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
            
            if (fs.existsSync(filePath) && !item.data) {
              const fileData = fs.readFileSync(filePath);
              const encodedData = fileData.toString("base64");
              await storage.updateMediaData(item.id, Buffer.from(encodedData, "utf8"));
            }
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

  app.get("/api/posts/most-read-global", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 4;
      const mostRead = await storage.getMostReadGlobal(0, limit);
      res.json(mostRead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 4;
      const recentPosts = await storage.getPosts({ status: "published", limit });
      res.json(recentPosts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/slug/:slug", async (req, res) => {
    try {
      const post = await storage.getPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });

      let visitorId = (req as any).cookies?.visitor_id;
      if (!visitorId) {
        const { randomUUID } = await import("crypto");
        visitorId = randomUUID();
        res.cookie("visitor_id", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" });
      }

      let referrer: string | undefined;
      const refHeader = req.headers.referer || req.headers.referrer;
      if (refHeader) {
        try {
          const refUrl = new URL(refHeader as string);
          const ownHosts = ["blog-academy.replit.app", "blog.psicometriaonline.com.br", "localhost"];
          if (!ownHosts.some(h => refUrl.hostname.includes(h))) {
            referrer = refUrl.hostname.replace(/^www\./, "");
          }
        } catch {}
      }

      storage.incrementViewCount(post.id, visitorId, referrer).catch(() => {});
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

  app.get("/api/admin/categories/:slug/details", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) return res.status(404).json({ message: "Categoria não encontrada" });

      const allCatPosts = await storage.getPostsByCategory(req.params.slug, { limit: 5000, offset: 0 });
      const totalViews = allCatPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

      const allPosts = await storage.getPosts({ limit: 5000, offset: 0 });
      const slugToId = new Map<string, number>();
      for (const p of allPosts) slugToId.set(p.slug, p.id);

      const internalDomains = ["blog.psicometriaonline.com.br", "www.blog.psicometriaonline.com.br", "blog-academy.replit.app"];
      const hrefRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
      const outboundMap: Record<number, number> = {};
      const inboundMap: Record<number, number> = {};
      for (const p of allPosts) { outboundMap[p.id] = 0; inboundMap[p.id] = 0; }

      for (const p of allPosts) {
        const content = p.content || "";
        let match;
        hrefRegex.lastIndex = 0;
        const seenSlugs = new Set<string>();
        while ((match = hrefRegex.exec(content)) !== null) {
          let href = match[1];
          let slug: string | null = null;
          if (href.startsWith("http://") || href.startsWith("https://")) {
            try { const url = new URL(href); if (!internalDomains.includes(url.hostname)) continue; slug = url.pathname.replace(/^\//, "").replace(/\/$/, ""); } catch { continue; }
          } else { slug = href.replace(/^\//, "").replace(/\/$/, ""); }
          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const targetId = slugToId.get(slug);
          if (targetId && targetId !== p.id) { outboundMap[p.id]++; inboundMap[targetId]++; }
        }
      }

      const sortBy = req.query.sortBy as string || "publishedAt";
      const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      const postsWithMetrics = allCatPosts.map(p => ({
        id: p.id, title: p.title, slug: p.slug, status: p.status,
        publishedAt: p.publishedAt, viewCount: p.viewCount || 0,
        authorName: p.authorName || p.author?.name || null,
        inboundLinks: inboundMap[p.id] || 0,
        outboundLinks: outboundMap[p.id] || 0,
      }));

      postsWithMetrics.sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "title": cmp = a.title.localeCompare(b.title, "pt-BR"); break;
          case "viewCount": cmp = a.viewCount - b.viewCount; break;
          case "inboundLinks": cmp = a.inboundLinks - b.inboundLinks; break;
          case "outboundLinks": cmp = a.outboundLinks - b.outboundLinks; break;
          default: cmp = new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime();
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });

      res.json({ category, totalPosts: allCatPosts.length, totalViews, posts: postsWithMetrics });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/tags/:slug/details", isAuthenticated, async (req, res) => {
    try {
      const tag = await storage.getTagBySlug(req.params.slug);
      if (!tag) return res.status(404).json({ message: "Tag não encontrada" });

      const allTagPosts = await storage.getPostsByTag(req.params.slug, { limit: 5000, offset: 0 });
      const totalViews = allTagPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

      const allPosts = await storage.getPosts({ limit: 5000, offset: 0 });
      const slugToId = new Map<string, number>();
      for (const p of allPosts) slugToId.set(p.slug, p.id);

      const internalDomains = ["blog.psicometriaonline.com.br", "www.blog.psicometriaonline.com.br", "blog-academy.replit.app"];
      const hrefRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
      const outboundMap: Record<number, number> = {};
      const inboundMap: Record<number, number> = {};
      for (const p of allPosts) { outboundMap[p.id] = 0; inboundMap[p.id] = 0; }

      for (const p of allPosts) {
        const content = p.content || "";
        let match;
        hrefRegex.lastIndex = 0;
        const seenSlugs = new Set<string>();
        while ((match = hrefRegex.exec(content)) !== null) {
          let href = match[1];
          let slug: string | null = null;
          if (href.startsWith("http://") || href.startsWith("https://")) {
            try { const url = new URL(href); if (!internalDomains.includes(url.hostname)) continue; slug = url.pathname.replace(/^\//, "").replace(/\/$/, ""); } catch { continue; }
          } else { slug = href.replace(/^\//, "").replace(/\/$/, ""); }
          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const targetId = slugToId.get(slug);
          if (targetId && targetId !== p.id) { outboundMap[p.id]++; inboundMap[targetId]++; }
        }
      }

      const sortBy = req.query.sortBy as string || "publishedAt";
      const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      const postsWithMetrics = allTagPosts.map(p => ({
        id: p.id, title: p.title, slug: p.slug, status: p.status,
        publishedAt: p.publishedAt, viewCount: p.viewCount || 0,
        authorName: p.authorName || p.author?.name || null,
        inboundLinks: inboundMap[p.id] || 0,
        outboundLinks: outboundMap[p.id] || 0,
      }));

      postsWithMetrics.sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "title": cmp = a.title.localeCompare(b.title, "pt-BR"); break;
          case "viewCount": cmp = a.viewCount - b.viewCount; break;
          case "inboundLinks": cmp = a.inboundLinks - b.inboundLinks; break;
          case "outboundLinks": cmp = a.outboundLinks - b.outboundLinks; break;
          default: cmp = new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime();
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });

      res.json({ tag, totalPosts: allTagPosts.length, totalViews, posts: postsWithMetrics });
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

  app.get("/api/posts/:id/suggested", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      if (!post) return res.json([]);
      const tagIds = post.tags.map((t: any) => t.id);
      const categoryIds = post.categories.map((c: any) => c.id);
      const suggested = await storage.getSuggestedPosts(postId, tagIds, categoryIds, 3);
      res.json(suggested);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id/most-read", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 3;
      const mostRead = await storage.getMostReadGlobal(postId, limit);
      res.json(mostRead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/diverse-sections", async (req, res) => {
    try {
      const context = (req.query.context as string) || "home";
      const settings = await storage.getAllSettings();
      let settingKey = "diverse_category_slugs";
      if (context === "category") settingKey = "category_page_diverse_slugs";
      else if (context === "tag") settingKey = "tag_page_diverse_slugs";

      const slugs = (settings[settingKey] || settings["diverse_category_slugs"] || "").split(",").filter(Boolean);
      const sections: { category: any; posts: any[] }[] = [];
      for (const slug of slugs.slice(0, 3)) {
        const cat = await storage.getCategoryBySlug(slug.trim());
        if (cat) {
          const catPosts = await storage.getPostsByCategory(slug.trim(), { limit: 4 });
          sections.push({ category: cat, posts: catPosts });
        }
      }
      res.json(sections);
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
      const { isLikelySpam } = await import("./spam-filter");
      const spamCheck = isLikelySpam(req.body.authorName || "", req.body.authorEmail || "", req.body.content || "");
      const parsed = insertCommentSchema.parse({
        ...req.body,
        postId,
        isApproved: false,
        isSpam: spamCheck.isSpam,
      });
      const comment = await storage.createComment(parsed);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/comments", isAuthenticated, async (req, res) => {
    try {
      const status = (req.query.status as string) || 'all';
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const result = await storage.getAllComments({ status, search, page, limit });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/comments/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comment = await storage.approveComment(id);
      if (!comment) return res.status(404).json({ message: "Comentário não encontrado" });
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/comments/:id/spam", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comment = await storage.markCommentAsSpam(id);
      if (!comment) return res.status(404).json({ message: "Comentário não encontrado" });
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/comments/:id/unspam", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comment = await storage.unmarkCommentSpam(id);
      if (!comment) return res.status(404).json({ message: "Comentário não encontrado" });
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteComment(id);
      if (!deleted) return res.status(404).json({ message: "Comentário não encontrado" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/comments/bulk", isAuthenticated, async (req, res) => {
    try {
      const { action, ids } = req.body;
      if (!action || !ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "action e ids são obrigatórios" });
      }
      const affected = await storage.bulkCommentAction(ids, action);
      res.json({ affected });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      if (sortBy === "inboundLinks" || sortBy === "outboundLinks") {
        const allFiltered = await storage.getPosts({ status, limit: 5000, offset: 0, search });
        const total = allFiltered.length;

        const slugToId = new Map<string, number>();
        for (const p of allFiltered) slugToId.set(p.slug, p.id);

        const internalDomains = ["blog.psicometriaonline.com.br", "www.blog.psicometriaonline.com.br", "blog-academy.replit.app"];
        const hrefRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
        const outboundMap: Record<number, number> = {};
        const inboundMap: Record<number, number> = {};
        for (const p of allFiltered) { outboundMap[p.id] = 0; inboundMap[p.id] = 0; }

        for (const p of allFiltered) {
          const content = p.content || "";
          let match;
          hrefRegex.lastIndex = 0;
          const seenSlugs = new Set<string>();
          while ((match = hrefRegex.exec(content)) !== null) {
            let href = match[1];
            let slug: string | null = null;
            if (href.startsWith("http://") || href.startsWith("https://")) {
              try { const url = new URL(href); if (!internalDomains.includes(url.hostname)) continue; slug = url.pathname.replace(/^\//, "").replace(/\/$/, ""); } catch { continue; }
            } else { slug = href.replace(/^\//, "").replace(/\/$/, ""); }
            if (!slug || seenSlugs.has(slug)) continue;
            seenSlugs.add(slug);
            const targetId = slugToId.get(slug);
            if (targetId && targetId !== p.id) { outboundMap[p.id]++; inboundMap[targetId]++; }
          }
        }

        const sortMap = sortBy === "inboundLinks" ? inboundMap : outboundMap;
        allFiltered.sort((a, b) => sortOrder === "asc" ? (sortMap[a.id] || 0) - (sortMap[b.id] || 0) : (sortMap[b.id] || 0) - (sortMap[a.id] || 0));
        const paginated = allFiltered.slice(offset, offset + limit);
        res.json({ posts: paginated, total, limit, offset });
      } else if (sortBy === "categories" || sortBy === "tags") {
        const allFiltered = await storage.getPosts({ status, limit: 5000, offset: 0, search });
        const total = allFiltered.length;

        allFiltered.sort((a, b) => {
          const aItems = sortBy === "categories" ? a.categories : a.tags;
          const bItems = sortBy === "categories" ? b.categories : b.tags;
          const aNames = aItems.map(i => i.name.toLowerCase()).sort((x, y) => x.localeCompare(y, "pt-BR"));
          const bNames = bItems.map(i => i.name.toLowerCase()).sort((x, y) => x.localeCompare(y, "pt-BR"));
          const aName = aNames.length > 0 ? aNames[0] : "";
          const bName = bNames.length > 0 ? bNames[0] : "";
          return sortOrder === "asc" ? aName.localeCompare(bName, "pt-BR") : bName.localeCompare(aName, "pt-BR");
        });

        const paginated = allFiltered.slice(offset, offset + limit);
        res.json({ posts: paginated, total, limit, offset });
      } else {
        const fetchedPosts = await storage.getPosts({ status, limit, offset, search, sortBy, sortOrder });
        const total = await storage.getPostCount(status, search);
        res.json({ posts: fetchedPosts, total, limit, offset });
      }
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
      if (postData.status === "scheduled" && !postData.publishedAt) {
        return res.status(400).json({ message: "Defina a data e hora de publicação para agendar o post." });
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
      if (postData.status === "scheduled" && !postData.publishedAt) {
        return res.status(400).json({ message: "Defina a data e hora de publicação para agendar o post." });
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

  app.get("/api/admin/posts/:id/check-links", isAuthenticated, async (req, res) => {
    try {
      const post = await storage.getPost(parseInt(req.params.id));
      if (!post) return res.status(404).json({ message: "Post not found" });

      const content = post.content || "";
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      const links: { url: string; text: string; status: "ok" | "broken" | "error"; statusCode?: number; reason?: string }[] = [];
      const seen = new Set<string>();
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const url = match[1];
        const text = match[2].replace(/<[^>]*>/g, "").trim();
        if (seen.has(url)) continue;
        seen.add(url);
        if (url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:")) continue;
        links.push({ url, text, status: "ok" });
      }

      const DOMAIN = "blog.psicometriaonline.com.br";

      await Promise.all(links.map(async (link) => {
        try {
          const isInternal = link.url.startsWith("/") || link.url.includes(DOMAIN);
          if (isInternal) {
            let slug = link.url;
            if (slug.startsWith("/")) {
              slug = slug.replace(/^\/+/, "").replace(/\/+$/, "");
            } else {
              try {
                const parsed = new URL(link.url);
                slug = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
              } catch {
                link.status = "error";
                link.reason = "URL inválida";
                return;
              }
            }
            if (!slug) {
              link.status = "ok";
              return;
            }
            const found = await storage.getPostBySlug(slug);
            if (found) {
              link.status = "ok";
            } else {
              link.status = "broken";
              link.reason = "Slug não encontrado";
            }
          } else {
            try {
              const parsed = new URL(link.url);
              if (!["http:", "https:"].includes(parsed.protocol)) {
                link.status = "error";
                link.reason = "Protocolo não suportado";
                return;
              }
              const hostname = parsed.hostname.toLowerCase();
              if (hostname === "localhost" || hostname.endsWith(".local") || hostname === "metadata.google.internal" || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/.test(hostname) || hostname === "[::1]") {
                link.status = "error";
                link.reason = "URL interna bloqueada";
                return;
              }
            } catch {
              link.status = "error";
              link.reason = "URL inválida";
              return;
            }
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
              const response = await fetch(link.url, {
                method: "HEAD",
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)" },
              });
              clearTimeout(timeout);
              link.statusCode = response.status;
              if (response.ok) {
                link.status = "ok";
              } else if (response.status === 405) {
                const getResponse = await fetch(link.url, {
                  method: "GET",
                  signal: AbortSignal.timeout(8000),
                  redirect: "follow",
                  headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)" },
                });
                link.statusCode = getResponse.status;
                link.status = getResponse.ok ? "ok" : "broken";
                if (!getResponse.ok) link.reason = `HTTP ${getResponse.status}`;
              } else {
                link.status = "broken";
                link.reason = `HTTP ${response.status}`;
              }
            } catch (e: any) {
              clearTimeout(timeout);
              link.status = "error";
              link.reason = e.name === "AbortError" ? "Timeout" : (e.message || "Erro de conexão");
            }
          }
        } catch (e: any) {
          link.status = "error";
          link.reason = e.message || "Erro desconhecido";
        }
      }));

      res.json({ links, total: links.length, broken: links.filter(l => l.status !== "ok").length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/posts/:id/link-suggestions", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const postContent = post.content || "";
      const focusKeyword = (post.focusKeyword || "").toLowerCase().trim();

      const postCategoryIds = post.categories.map(c => c.id);
      const postTagIds = post.tags.map(t => t.id);

      const allPublished = await storage.getPosts({ status: "published", limit: 500 });
      const candidates = allPublished.filter(p => p.id !== postId);

      const suggestions: { title: string; slug: string; reason: string }[] = [];
      const alreadyLinked = new Set<string>();

      const hrefRegex = /href=["'](?:https?:\/\/[^"']*?)?\/([^"'#?]+)/gi;
      let match;
      while ((match = hrefRegex.exec(postContent)) !== null) {
        alreadyLinked.add(match[1].replace(/\/$/, ""));
      }

      for (const candidate of candidates) {
        if (alreadyLinked.has(candidate.slug)) continue;
        if (postContent.includes(`/${candidate.slug}`)) continue;

        const reasons: string[] = [];

        const sharedCats = candidate.categories.filter(c => postCategoryIds.includes(c.id));
        if (sharedCats.length > 0) {
          reasons.push(`Mesma categoria: ${sharedCats.map(c => c.name).join(", ")}`);
        }

        const sharedTags = candidate.tags.filter(t => postTagIds.includes(t.id));
        if (sharedTags.length > 0) {
          reasons.push(`Mesma tag: ${sharedTags.map(t => t.name).join(", ")}`);
        }

        if (focusKeyword && candidate.title.toLowerCase().includes(focusKeyword)) {
          reasons.push("Palavra-chave no titulo");
        }

        if (reasons.length > 0) {
          suggestions.push({
            title: candidate.title,
            slug: candidate.slug,
            reason: reasons.join("; "),
          });
        }

        if (suggestions.length >= 10) break;
      }

      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/posts/link-counts", isAuthenticated, async (req, res) => {
    try {
      const allPosts = await storage.getPosts({ limit: 5000, offset: 0 });
      const slugToId = new Map<string, number>();
      for (const p of allPosts) {
        slugToId.set(p.slug, p.id);
      }

      const hrefRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
      const outbound: Record<number, Set<number>> = {};
      const inbound: Record<number, Set<number>> = {};

      for (const p of allPosts) {
        outbound[p.id] = new Set();
        if (!inbound[p.id]) inbound[p.id] = new Set();
      }

      const internalDomains = [
        "blog.psicometriaonline.com.br",
        "www.blog.psicometriaonline.com.br",
        "blog-academy.replit.app",
      ];

      for (const p of allPosts) {
        const content = p.content || "";
        let match;
        hrefRegex.lastIndex = 0;
        const seenSlugs = new Set<string>();
        while ((match = hrefRegex.exec(content)) !== null) {
          let href = match[1];
          let slug: string | null = null;

          if (href.startsWith("http://") || href.startsWith("https://")) {
            try {
              const url = new URL(href);
              if (!internalDomains.includes(url.hostname)) continue;
              slug = url.pathname.replace(/^\//, "").replace(/\/$/, "");
            } catch {
              continue;
            }
          } else {
            slug = href.replace(/^\//, "").replace(/\/$/, "");
          }

          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const targetId = slugToId.get(slug);
          if (targetId && targetId !== p.id) {
            outbound[p.id].add(targetId);
            if (!inbound[targetId]) inbound[targetId] = new Set();
            inbound[targetId].add(p.id);
          }
        }
      }

      const result: Record<number, { inbound: number; outbound: number }> = {};
      for (const p of allPosts) {
        result[p.id] = {
          inbound: inbound[p.id]?.size || 0,
          outbound: outbound[p.id]?.size || 0,
        };
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/posts/export", isAuthenticated, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const allPosts = await storage.getPosts({ limit: 100000, offset: 0 });
      const filteredPosts = search 
        ? allPosts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
        : allPosts;

      const internalDomains = ["blog.psicometriaonline.com.br", "www.blog.psicometriaonline.com.br", "blog-academy.replit.app"];
      const hrefRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
      const slugToId = new Map<string, number>();
      for (const p of allPosts) slugToId.set(p.slug, p.id);

      const inboundMap: Record<number, number> = {};
      const outboundMap: Record<number, number> = {};
      for (const p of allPosts) { inboundMap[p.id] = 0; outboundMap[p.id] = 0; }

      for (const p of allPosts) {
        const content = p.content || "";
        let match;
        hrefRegex.lastIndex = 0;
        const seenSlugs = new Set<string>();
        while ((match = hrefRegex.exec(content)) !== null) {
          let href = match[1];
          let slug: string | null = null;
          if (href.startsWith("http://") || href.startsWith("https://")) {
            try {
              const url = new URL(href);
              if (!internalDomains.includes(url.hostname)) continue;
              slug = url.pathname.replace(/^\//, "").replace(/\/$/, "");
            } catch {
              continue;
            }
          } else {
            slug = href.replace(/^\//, "").replace(/\/$/, "");
          }
          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const targetId = slugToId.get(slug);
          if (targetId && targetId !== p.id) {
            outboundMap[p.id]++;
            inboundMap[targetId]++;
          }
        }
      }

      const escapeCSVField = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '""';
        const str = String(value);
        if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      const rows = filteredPosts.map((p) => [
        escapeCSVField(p.title || ""),
        escapeCSVField(p.slug || ""),
        escapeCSVField(p.authorName || ""),
        escapeCSVField(p.categories.map((c) => c.name).join(" | ")),
        escapeCSVField(p.tags.map((t) => t.name).join(" | ")),
        escapeCSVField(p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("pt-BR") : ""),
        escapeCSVField(p.status || ""),
        escapeCSVField(inboundMap[p.id] || 0),
        escapeCSVField(outboundMap[p.id] || 0),
      ]);

      const csv =
        "\uFEFF" +
        "Título;Slug;Autor;Categorias;Tags;Data de Publicação;Status;Links Recebidos;Links Enviados\n" +
        rows.map((r) => r.join(";")).join("\n");

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="posts-export-${dateStr}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/posts/:id/internal-links", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const allPosts = await storage.getPosts({ limit: 5000, offset: 0 });
      const slugToPost = new Map<string, { id: number; title: string; slug: string }>();
      const idToPost = new Map<number, { id: number; title: string; slug: string }>();
      for (const p of allPosts) {
        const info = { id: p.id, title: p.title, slug: p.slug };
        slugToPost.set(p.slug, info);
        idToPost.set(p.id, info);
      }

      const internalDomains = [
        "blog.psicometriaonline.com.br",
        "www.blog.psicometriaonline.com.br",
        "blog-academy.replit.app",
      ];
      const hrefRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;

      function extractSlug(href: string): string | null {
        if (href.startsWith("http://") || href.startsWith("https://")) {
          try {
            const url = new URL(href);
            if (!internalDomains.includes(url.hostname)) return null;
            return url.pathname.replace(/^\//, "").replace(/\/$/, "");
          } catch { return null; }
        }
        return href.replace(/^\//, "").replace(/\/$/, "");
      }

      const outboundIds = new Set<number>();
      const currentPost = allPosts.find(p => p.id === postId);
      if (!currentPost) {
        return res.status(404).json({ message: "Post não encontrado" });
      }
      {
        const content = currentPost.content || "";
        let match;
        hrefRegex.lastIndex = 0;
        const seenSlugs = new Set<string>();
        while ((match = hrefRegex.exec(content)) !== null) {
          const slug = extractSlug(match[1]);
          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const target = slugToPost.get(slug);
          if (target && target.id !== postId) outboundIds.add(target.id);
        }
      }

      const inboundIds = new Set<number>();
      for (const p of allPosts) {
        if (p.id === postId) continue;
        const content = p.content || "";
        let match;
        hrefRegex.lastIndex = 0;
        const seenSlugs = new Set<string>();
        while ((match = hrefRegex.exec(content)) !== null) {
          const slug = extractSlug(match[1]);
          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const target = slugToPost.get(slug);
          if (target && target.id === postId) { inboundIds.add(p.id); break; }
        }
      }

      const inbound = Array.from(inboundIds).map(id => idToPost.get(id)!).filter(Boolean);
      const outbound = Array.from(outboundIds).map(id => idToPost.get(id)!).filter(Boolean);

      res.json({ inbound, outbound });
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

  app.get("/api/admin/tags/post-counts", isAuthenticated, async (req, res) => {
    try {
      const rows = await db.select({ tagId: postTags.tagId, count: sql<number>`count(*)::int` }).from(postTags).groupBy(postTags.tagId);
      const result: Record<number, number> = {};
      for (const row of rows) result[row.tagId] = row.count;
      res.json(result);
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
      const existing = await storage.getBannersBySlot(parsed.slot);
      if (existing.length > 0) {
        return res.status(409).json({ message: `Cada slot pode ter no máximo um banner. O slot "${parsed.slot}" já possui um banner.` });
      }
      const b = await storage.createBanner(parsed);
      res.status(201).json(b);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/banners/:id", isAuthenticated, async (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      const currentBanner = await storage.getBanner(bannerId);
      if (!currentBanner) return res.status(404).json({ message: "Banner not found" });
      
      if (req.body.slot && req.body.slot !== currentBanner.slot) {
        const existing = await storage.getBannersBySlot(req.body.slot);
        if (existing.length > 0) {
          return res.status(409).json({ message: `Cada slot pode ter no máximo um banner. O slot "${req.body.slot}" já possui um banner.` });
        }
      }
      
      const b = await storage.updateBanner(bannerId, req.body);
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

  // ===== SUBSCRIBER ROUTES =====

  app.post("/api/subscribe", async (req, res) => {
    try {
      const { name, email, source } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "E-mail inválido" });
      }
      const safeName = typeof name === "string" ? name.trim().slice(0, 200) : undefined;
      const safeSource = ["hero", "newsletter"].includes(source) ? source : "hero";
      const subscriber = await storage.createSubscriber({ name: safeName, email: email.trim().slice(0, 320), source: safeSource });
      res.json({ message: "Inscrito com sucesso!", subscriber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/subscribers", isAuthenticated, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getSubscribers({ search, page, limit });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/subscribers/export", isAuthenticated, async (_req, res) => {
    try {
      const { data } = await storage.getSubscribers({ limit: 100000 });
      const sanitizeCell = (val: string) => {
        let v = val.replace(/"/g, '""');
        if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
        return `"${v}"`;
      };
      const csv = ["Nome,E-mail,Fonte,Data"];
      for (const s of data) {
        csv.push(`${sanitizeCell(s.name || '')},${sanitizeCell(s.email)},${sanitizeCell(s.source)},${sanitizeCell(s.createdAt ? new Date(s.createdAt).toISOString() : '')}`);
      }
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=inscritos.csv");
      res.send(csv.join("\n"));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/post-counts", isAuthenticated, async (_req, res) => {
    try {
      const counts = await storage.getPostCountsByStatus();
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/subscribers/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteSubscriber(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Inscrito não encontrado" });
      res.json({ message: "Inscrito removido" });
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
      const totalVisitors = await storage.getTotalVisitors(startDate, endDate, postId);
      res.json({ data, total, totalVisitors });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/posts", isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      const sortDir = (req.query.sort as string) === "asc" ? "asc" as const : "desc" as const;
      const search = req.query.search as string | undefined;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const tagId = req.query.tagId ? parseInt(req.query.tagId as string) : undefined;
      const postId = req.query.postId ? parseInt(req.query.postId as string) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date range" });
      }

      const result = await storage.getPostViewsSummary(startDate, endDate, { sortDir, search, categoryId, tagId, postId, page, limit });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/referrers", isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date range" });
      }

      const data = await storage.getReferrerStats(startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics/export", isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      const sortDir = (req.query.sort as string) === "asc" ? "asc" as const : "desc" as const;
      const search = req.query.search as string | undefined;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const tagId = req.query.tagId ? parseInt(req.query.tagId as string) : undefined;

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date range" });
      }

      const escapeCSVField = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '""';
        const str = String(value);
        if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      const data = await storage.getAnalyticsExportData(startDate, endDate, { search, categoryId, tagId, sortDir });

      const rows = data.map((item) => [
        escapeCSVField(item.title),
        escapeCSVField(item.slug),
        escapeCSVField(item.authorName),
        escapeCSVField(item.categories.map((c) => c.name).join(" | ")),
        escapeCSVField(item.tags.map((t) => t.name).join(" | ")),
        escapeCSVField(item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("pt-BR") : ""),
        escapeCSVField(item.viewsInPeriod),
        escapeCSVField(item.visitorsInPeriod),
        escapeCSVField(item.viewsTotal),
        escapeCSVField(item.avgViewsPerDay),
        escapeCSVField(item.topReferrer),
      ]);

      const csv =
        "\uFEFF" +
        "Título;Slug;Autor;Categorias;Tags;Data de Publicação;Visualizações (Período);Visitantes Únicos (Período);Visualizações (Total);Média Views/Dia;Principal Referrer\n" +
        rows.map((r) => r.join(";")).join("\n");

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="analytics-report-${dateStr}.csv"`);
      res.send(csv);
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

  app.post("/api/admin/crawl/import-seo", isAuthenticated, async (req, res) => {
    try {
      const dryRun = req.query.dryRun !== "false";
      const WP_BASE = "https://blog.psicometriaonline.com.br";
      const allPosts = await storage.getPosts({ limit: 1000, offset: 0 });
      const results: { id: number; slug: string; title: string; seoTitle: string | null; metaDescription: string | null; focusKeyword: string | null }[] = [];
      const skipped: { id: number; slug: string; reason: string }[] = [];
      const errors: { id: number; slug: string; error: string }[] = [];
      let actuallyUpdated = 0;

      function deriveFocusKeyword(seoTitle: string): string {
        let keyword = seoTitle;
        const separators = [': ', ' - ', ' – ', ' | '];
        for (const sep of separators) {
          const idx = keyword.indexOf(sep);
          if (idx > 0) {
            keyword = keyword.substring(0, idx);
            break;
          }
        }
        if (keyword.endsWith(':') || keyword.endsWith('|')) {
          keyword = keyword.slice(0, -1);
        }
        return keyword.trim().toLowerCase();
      }

      for (const post of allPosts) {
        if (post.seoTitle && post.metaDescription && post.focusKeyword) {
          skipped.push({ id: post.id, slug: post.slug, reason: "already has SEO data" });
          continue;
        }

        try {
          const wpUrl = `${WP_BASE}/wp-json/wp/v2/posts?slug=${encodeURIComponent(post.slug)}&_fields=id,yoast_head_json`;
          const wpRes = await fetch(wpUrl);
          if (!wpRes.ok) {
            errors.push({ id: post.id, slug: post.slug, error: `WP API returned ${wpRes.status}` });
            continue;
          }
          const wpData = await wpRes.json();
          if (!wpData || wpData.length === 0) {
            skipped.push({ id: post.id, slug: post.slug, reason: "not found in WordPress" });
            continue;
          }

          const yoast = wpData[0].yoast_head_json;
          if (!yoast) {
            skipped.push({ id: post.id, slug: post.slug, reason: "no Yoast data in WP" });
            continue;
          }

          const seoTitle = yoast.title || null;
          const metaDesc = yoast.description || null;
          const focusKeyword = seoTitle ? deriveFocusKeyword(seoTitle) : null;

          if (!seoTitle && !metaDesc) {
            skipped.push({ id: post.id, slug: post.slug, reason: "empty Yoast data" });
            continue;
          }

          results.push({
            id: post.id,
            slug: post.slug,
            title: post.title,
            seoTitle,
            metaDescription: metaDesc,
            focusKeyword,
          });

          if (!dryRun) {
            const updateData: any = {};
            if (seoTitle && !post.seoTitle) updateData.seoTitle = seoTitle;
            if (metaDesc && !post.metaDescription) updateData.metaDescription = metaDesc;
            if (focusKeyword && !post.focusKeyword) updateData.focusKeyword = focusKeyword;
            if (Object.keys(updateData).length > 0) {
              await storage.updatePost(post.id, updateData);
              actuallyUpdated++;
            }
          }
        } catch (err: any) {
          errors.push({ id: post.id, slug: post.slug, error: err.message });
        }
      }

      res.json({
        dryRun,
        totalPosts: allPosts.length,
        imported: dryRun ? results.length : actuallyUpdated,
        candidates: results.length,
        skipped: skipped.length,
        errors: errors.length,
        results: results.slice(0, 20),
        skippedDetails: skipped.slice(0, 10),
        errorDetails: errors,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/crawl/import-comments", isAuthenticated, async (req, res) => {
    try {
      const { crawlWordPressComments } = await import("./crawler");
      const { comments: wpComments, errors } = await crawlWordPressComments();

      const allPosts = await storage.getPosts({ limit: 10000 });
      console.log(`[Import] Buscados ${Array.isArray(allPosts) ? allPosts.length : "erro"} posts para mapeamento`);
      
      const slugToPostId: Record<string, number> = {};
      for (const p of allPosts) {
        slugToPostId[p.slug] = p.id;
        if (p.sourceUrl) {
          const match = p.sourceUrl.match(/\/([^\/]+)\/?$/);
          if (match) slugToPostId[match[1]] = p.id;
        }
      }

      const wpIdToLocalParent: Record<number, number> = {};
      let imported = 0;
      let skipped = 0;

      const existingComments = await db.select({ sourceUrl: comments.sourceUrl })
        .from(comments)
        .where(sql`${comments.sourceUrl} like 'wp-comment-%'`);
      const existingSourceUrls = new Set(existingComments.map(c => c.sourceUrl));

      for (const wc of wpComments) {
        const localPostId = slugToPostId[wc.wpPostSlug];
        if (!localPostId) {
          skipped++;
          continue;
        }

        const sourceUrl = `wp-comment-${wc.wpCommentId}`;
        if (existingSourceUrls.has(sourceUrl)) {
          skipped++;
          continue;
        }

        try {
          const comment = await storage.createComment({
            postId: localPostId,
            authorName: wc.authorName,
            authorEmail: wc.authorEmail,
            content: wc.content,
            isApproved: true,
            isSpam: false,
            parentId: wc.parentWpId ? (wpIdToLocalParent[wc.parentWpId] || null) : null,
            sourceUrl,
          });

          wpIdToLocalParent[wc.wpCommentId] = comment.id;
          imported++;
        } catch (err: any) {
          skipped++;
        }
      }

      res.json({ imported, skipped, totalFetched: wpComments.length, errors });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/crawl/import-seo-csv", isAuthenticated, async (req, res) => {
    try {
      const dryRun = req.query.dryRun !== "false";
      const csvPath = path.resolve(process.cwd(), "attached_assets/posts-blog_1772631508691.csv");
      const csvContent = fs.readFileSync(csvPath, "utf-8");

      const lines = csvContent.split("\n");
      const header = lines[0].replace(/^\uFEFF/, "");
      const cols = header.split(";");

      const rows: { focusKeyword: string; title: string; seoTitle: string; slug: string; status: string }[] = [];
      let i = 1;
      while (i < lines.length) {
        let line = lines[i];
        while (line && (line.split(";").length - 1) < (cols.length - 1) && i + 1 < lines.length) {
          i++;
          line += " " + lines[i];
        }
        i++;
        if (!line || !line.trim()) continue;
        const parts = line.split(";");
        if (parts.length < 9) continue;

        const status = parts[1]?.trim();
        const focusKeyword = parts[5]?.trim();
        const title = parts[6]?.trim();
        let seoTitle = parts[7]?.trim();
        const link = parts[8]?.trim();

        if (!link) continue;

        if (seoTitle?.startsWith("Título SEO:")) {
          seoTitle = seoTitle.replace(/^Título SEO:\s*/, "").trim();
        }
        if (seoTitle === "—" || seoTitle === "-") {
          seoTitle = title;
        }

        let slug = link
          .replace(/^https?:\/\/(www\.)?blog\.psicometriaonline\.com\.br\//, "")
          .replace(/\/$/, "")
          .trim();

        if (!slug) continue;

        rows.push({ focusKeyword, title, seoTitle, slug, status });
      }

      const slugMapping: Record<string, string> = {
        "como-testar-a-normalidade-da-amostra-com-kolgomorov-smirnov-e-shapiro-wilk": "como-testar-a-normalidade-da-amostra-com-kolmogorov-smirnov-e-shapiro-wilk",
        "quando-utilizar-o-teste-t-de-amostras-independentes-e-analise-de-variancia-anova": "comparacao-entre-grupos-teste-t-e-anova",
        "tutorial-quando-e-como-utilizar-analise-de-variancia-anova": "como-realizar-a-analise-de-variancia-anova-no-jasp",
        "analise-fatorial-confirmatoria-2": "analise-fatorial-confirmatoria",
        "diferenca-entre-as-regressoes-logisticas-binaria-ordinal-e-multinomial": "tipos-de-regressao-logistica",
        "principais-metodos-de-retencao-de-fatores": "principais-metodos-de-retencao-fatorial",
        "glossario-da-analise-fatorial-exploratoria": "termos-importantes-da-analise-fatorial-exploratoria",
        "o-que-e-path-analysis": "path-analysis-conheca-essa-tecnica-de-analise-de-dados",
        "tutorial-invariancia-de-medicao-mimic-no-jasp": "tutorial-analise-de-invariancia-de-medicao-mimic-no-jasp",
        "como-calcular-o-escore-z-no-SPSS": "como-calcular-o-escore-z-no-spss",
        "machine-learning-entenda-como-as-maquinas-aprendem": "aprendizado-de-maquina-entenda-como-as-maquinas-aprendem",
      };

      const allPosts = await storage.getPosts({ limit: 1000, offset: 0 });
      const postsBySlug = new Map<string, typeof allPosts[0]>();
      for (const post of allPosts) {
        postsBySlug.set(post.slug, post);
      }

      const matched: { id: number; slug: string; title: string; seoTitle: string; focusKeyword: string; fieldsUpdated: string[] }[] = [];
      const unmatchedCsv: { slug: string; title: string; status: string }[] = [];
      let actuallyUpdated = 0;

      for (const row of rows) {
        const resolvedSlug = slugMapping[row.slug] || row.slug;
        const post = postsBySlug.get(resolvedSlug);
        if (!post) {
          unmatchedCsv.push({ slug: row.slug, title: row.title, status: row.status });
          continue;
        }

        const updateData: any = {};
        const fieldsUpdated: string[] = [];

        if (row.seoTitle && !post.seoTitle) {
          updateData.seoTitle = row.seoTitle;
          fieldsUpdated.push("seoTitle");
        }
        if (row.focusKeyword && !post.focusKeyword) {
          updateData.focusKeyword = row.focusKeyword;
          fieldsUpdated.push("focusKeyword");
        }

        if (Object.keys(updateData).length === 0) {
          continue;
        }

        matched.push({
          id: post.id,
          slug: post.slug,
          title: post.title,
          seoTitle: row.seoTitle,
          focusKeyword: row.focusKeyword,
          fieldsUpdated,
        });

        if (!dryRun) {
          await storage.updatePost(post.id, updateData);
          actuallyUpdated++;
        }
      }

      const postsStillMissing = allPosts.filter(p => {
        const hasAllSeo = p.seoTitle && p.focusKeyword;
        if (dryRun) {
          const willBeUpdated = matched.find(m => m.id === p.id);
          if (willBeUpdated) {
            const willHaveSeoTitle = p.seoTitle || willBeUpdated.fieldsUpdated.includes("seoTitle");
            const willHaveKeyword = p.focusKeyword || willBeUpdated.fieldsUpdated.includes("focusKeyword");
            return !(willHaveSeoTitle && willHaveKeyword);
          }
        }
        return !hasAllSeo;
      });

      res.json({
        dryRun,
        csvRows: rows.length,
        matched: matched.length,
        actuallyUpdated: dryRun ? matched.length : actuallyUpdated,
        unmatchedFromCsv: unmatchedCsv.length,
        unmatchedCsvDetails: unmatchedCsv,
        matchedDetails: matched.slice(0, 30),
        postsStillMissingSeo: postsStillMissing.length,
        postsStillMissingSeoDetails: postsStillMissing.map(p => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          hasSeoTitle: !!p.seoTitle,
          hasFocusKeyword: !!p.focusKeyword,
          hasMetaDescription: !!p.metaDescription,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
