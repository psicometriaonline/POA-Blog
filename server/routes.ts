import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuthorSchema, insertCategorySchema, insertTagSchema, insertPostSchema, insertBannerSchema, insertFreeMaterialSchema, insertCommentSchema, insertImageGroupSchema, insertImageBankItemSchema, insertContainerRuleSchema, insertMediaSchema } from "@shared/schema";
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

  app.post("/api/admin/media/import-from-posts", isAuthenticated, async (_req, res) => {
    try {
      const allPosts = await storage.getPosts(1000, 0);
      const seenUrls = new Set<string>();
      const toInsert: { url: string; filename: string; altText?: string; source: string }[] = [];

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
        await storage.createMedia({
          filename: item.filename,
          url: item.url,
          altText: item.altText || null,
          source: item.source,
        });
        imported++;
      }

      res.json({ imported, total: toInsert.length, alreadyExisted: toInsert.length - imported });
    } catch (error: any) {
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
      if (!query) return res.json({ posts: [], total: 0, limit, offset });
      const posts = await storage.searchPosts(query, { limit, offset });
      const total = await storage.searchPostCount(query);
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

  // ===== ADMIN ROUTES (Protected) =====

  app.get("/api/admin/posts", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;
      const posts = await storage.getPosts({ status, limit, offset });
      const total = await storage.getPostCount(status);
      res.json({ posts, total, limit, offset });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/posts", isAuthenticated, async (req, res) => {
    try {
      const { categoryIds, tagIds, ...postData } = req.body;
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
      if (postData.publishedAt) {
        postData.publishedAt = new Date(postData.publishedAt);
      }
      const post = await storage.updatePost(parseInt(req.params.id), postData, categoryIds, tagIds);
      if (!post) return res.status(404).json({ message: "Post not found" });
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
      const success = await storage.deleteCategory(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Category not found" });
      res.json({ message: "Category deleted" });
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
      const success = await storage.deleteTag(parseInt(req.params.id));
      if (!success) return res.status(404).json({ message: "Tag not found" });
      res.json({ message: "Tag deleted" });
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

  app.get("/api/posts/:id/container-images", async (req, res) => {
    try {
      const results = await storage.getContainerImagesForPost(parseInt(req.params.id));
      res.json(results);
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
