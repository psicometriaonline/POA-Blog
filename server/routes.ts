import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuthorSchema, insertCategorySchema, insertTagSchema, insertPostSchema, insertBannerSchema, insertFreeMaterialSchema, insertCommentSchema } from "@shared/schema";
import { crawlMultipleUrls } from "./crawler";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";

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

      const total = await storage.getTotalViews(startDate, endDate);
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
