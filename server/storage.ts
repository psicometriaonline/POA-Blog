import {
  type Author, type InsertAuthor,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type Post, type InsertPost,
  type PostWithRelations,
  type Banner, type InsertBanner,
  type FreeMaterial, type InsertFreeMaterial,
  type Comment, type InsertComment,
  authors, categories, tags, posts, postCategories, postTags,
  banners, freeMaterials, siteSettings, comments, postViews,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, sql, inArray, and, asc, gte, lte, count } from "drizzle-orm";

export interface IStorage {
  getAuthors(): Promise<Author[]>;
  getAuthor(id: number): Promise<Author | undefined>;
  createAuthor(data: InsertAuthor): Promise<Author>;
  updateAuthor(id: number, data: Partial<InsertAuthor>): Promise<Author | undefined>;
  deleteAuthor(id: number): Promise<boolean>;

  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(data: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  getTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  createTag(data: InsertTag): Promise<Tag>;
  updateTag(id: number, data: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;

  getPosts(options?: { status?: string; limit?: number; offset?: number }): Promise<PostWithRelations[]>;
  getPostCount(status?: string): Promise<number>;
  getPost(id: number): Promise<PostWithRelations | undefined>;
  getPostBySlug(slug: string): Promise<PostWithRelations | undefined>;
  getPostsByCategory(categorySlug: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]>;
  getPostCountByCategory(categorySlug: string): Promise<number>;
  getPostsByTag(tagSlug: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]>;
  getPostCountByTag(tagSlug: string): Promise<number>;
  searchPosts(query: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]>;
  searchPostCount(query: string): Promise<number>;
  createPost(data: InsertPost, categoryIds?: number[], tagIds?: number[]): Promise<PostWithRelations>;
  updatePost(id: number, data: Partial<InsertPost>, categoryIds?: number[], tagIds?: number[]): Promise<PostWithRelations | undefined>;
  deletePost(id: number): Promise<boolean>;
  incrementViewCount(id: number): Promise<void>;

  getBanners(slot?: string): Promise<Banner[]>;
  getBanner(id: number): Promise<Banner | undefined>;
  createBanner(data: InsertBanner): Promise<Banner>;
  updateBanner(id: number, data: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: number): Promise<boolean>;

  getFreeMaterials(): Promise<FreeMaterial[]>;
  getFreeMaterial(id: number): Promise<FreeMaterial | undefined>;
  createFreeMaterial(data: InsertFreeMaterial): Promise<FreeMaterial>;
  updateFreeMaterial(id: number, data: Partial<InsertFreeMaterial>): Promise<FreeMaterial | undefined>;
  deleteFreeMaterial(id: number): Promise<boolean>;

  getMostReadByCategory(categoryId: number, excludePostId: number, limit?: number): Promise<PostWithRelations[]>;

  getCommentsByPost(postId: number): Promise<Comment[]>;
  createComment(data: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;

  getHomePageData(): Promise<any>;

  getViewsTimeSeries(startDate: Date, endDate: Date, postId?: number): Promise<{ date: string; views: number }[]>;
  getViewsTimeSeriesMonthly(startDate: Date, endDate: Date, postId?: number): Promise<{ date: string; views: number }[]>;
  getViewsTimeSeriesHourly(startDate: Date, endDate: Date, postId?: number): Promise<{ date: string; views: number }[]>;
  getPostViewsSummary(startDate: Date, endDate: Date, sortDir?: 'asc' | 'desc'): Promise<{ postId: number; title: string; slug: string; views: number }[]>;
  getTotalViews(startDate: Date, endDate: Date, postId?: number): Promise<number>;
}

async function enrichPostsWithRelations(rawPosts: Post[]): Promise<PostWithRelations[]> {
  if (rawPosts.length === 0) return [];

  const postIds = rawPosts.map(p => p.id);

  const pcRows = await db.select().from(postCategories)
    .where(inArray(postCategories.postId, postIds));
  const ptRows = await db.select().from(postTags)
    .where(inArray(postTags.postId, postIds));

  const catIds = [...new Set(pcRows.map(r => r.categoryId))];
  const tagIds = [...new Set(ptRows.map(r => r.tagId))];

  const allCats = catIds.length > 0
    ? await db.select().from(categories).where(inArray(categories.id, catIds))
    : [];
  const allTags = tagIds.length > 0
    ? await db.select().from(tags).where(inArray(tags.id, tagIds))
    : [];

  const authorIds = [...new Set(rawPosts.map(p => p.authorId).filter(Boolean))] as number[];
  const allAuthors = authorIds.length > 0
    ? await db.select().from(authors).where(inArray(authors.id, authorIds))
    : [];
  const authorMap = new Map(allAuthors.map(a => [a.id, a]));

  const catMap = new Map(allCats.map(c => [c.id, c]));
  const tagMap = new Map(allTags.map(t => [t.id, t]));

  return rawPosts.map(post => ({
    ...post,
    categories: pcRows
      .filter(r => r.postId === post.id)
      .map(r => catMap.get(r.categoryId)!)
      .filter(Boolean),
    tags: ptRows
      .filter(r => r.postId === post.id)
      .map(r => tagMap.get(r.tagId)!)
      .filter(Boolean),
    author: post.authorId ? authorMap.get(post.authorId) || null : null,
  }));
}

export class DatabaseStorage implements IStorage {
  async getAuthors(): Promise<Author[]> {
    return db.select().from(authors).orderBy(authors.name);
  }

  async getAuthor(id: number): Promise<Author | undefined> {
    const [a] = await db.select().from(authors).where(eq(authors.id, id));
    return a;
  }

  async createAuthor(data: InsertAuthor): Promise<Author> {
    const [a] = await db.insert(authors).values(data).returning();
    return a;
  }

  async updateAuthor(id: number, data: Partial<InsertAuthor>): Promise<Author | undefined> {
    const [a] = await db.update(authors).set(data).where(eq(authors.id, id)).returning();
    return a;
  }

  async deleteAuthor(id: number): Promise<boolean> {
    const result = await db.delete(authors).where(eq(authors.id, id)).returning();
    return result.length > 0;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    return cat;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, slug));
    return cat;
  }

  async createCategory(data: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(data).returning();
    return cat;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return cat;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async getTags(): Promise<Tag[]> {
    return db.select().from(tags).orderBy(tags.name);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug));
    return tag;
  }

  async createTag(data: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(data).returning();
    return tag;
  }

  async updateTag(id: number, data: Partial<InsertTag>): Promise<Tag | undefined> {
    const [tag] = await db.update(tags).set(data).where(eq(tags.id, id)).returning();
    return tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const result = await db.delete(tags).where(eq(tags.id, id)).returning();
    return result.length > 0;
  }

  async getPosts(options?: { status?: string; limit?: number; offset?: number }): Promise<PostWithRelations[]> {
    let query = db.select().from(posts).orderBy(desc(posts.publishedAt), desc(posts.createdAt)).$dynamic();

    if (options?.status) {
      query = query.where(eq(posts.status, options.status));
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const rawPosts = await query;
    return enrichPostsWithRelations(rawPosts);
  }

  async getPostCount(status?: string): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)::int` }).from(posts).$dynamic();
    if (status) {
      query = query.where(eq(posts.status, status));
    }
    const [result] = await query;
    return result.count;
  }

  async getPost(id: number): Promise<PostWithRelations | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) return undefined;
    const [enriched] = await enrichPostsWithRelations([post]);
    return enriched;
  }

  async getPostBySlug(slug: string): Promise<PostWithRelations | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    if (!post) return undefined;
    const [enriched] = await enrichPostsWithRelations([post]);
    return enriched;
  }

  async getPostsByCategory(categorySlug: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]> {
    const cat = await this.getCategoryBySlug(categorySlug);
    if (!cat) return [];

    let query = db.select({ postId: postCategories.postId })
      .from(postCategories)
      .where(eq(postCategories.categoryId, cat.id))
      .$dynamic();

    const pcRows = await query;
    const postIds = pcRows.map(r => r.postId);
    if (postIds.length === 0) return [];

    let postsQuery = db.select().from(posts)
      .where(inArray(posts.id, postIds))
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .$dynamic();

    if (options?.limit) postsQuery = postsQuery.limit(options.limit);
    if (options?.offset) postsQuery = postsQuery.offset(options.offset);

    const rawPosts = await postsQuery;
    return enrichPostsWithRelations(rawPosts);
  }

  async getPostCountByCategory(categorySlug: string): Promise<number> {
    const cat = await this.getCategoryBySlug(categorySlug);
    if (!cat) return 0;
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(postCategories)
      .where(eq(postCategories.categoryId, cat.id));
    return result.count;
  }

  async getPostsByTag(tagSlug: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]> {
    const tag = await this.getTagBySlug(tagSlug);
    if (!tag) return [];

    const ptRows = await db.select({ postId: postTags.postId })
      .from(postTags)
      .where(eq(postTags.tagId, tag.id));

    const postIds = ptRows.map(r => r.postId);
    if (postIds.length === 0) return [];

    let postsQuery = db.select().from(posts)
      .where(inArray(posts.id, postIds))
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .$dynamic();

    if (options?.limit) postsQuery = postsQuery.limit(options.limit);
    if (options?.offset) postsQuery = postsQuery.offset(options.offset);

    const rawPosts = await postsQuery;
    return enrichPostsWithRelations(rawPosts);
  }

  async getPostCountByTag(tagSlug: string): Promise<number> {
    const tag = await this.getTagBySlug(tagSlug);
    if (!tag) return 0;
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(postTags)
      .where(eq(postTags.tagId, tag.id));
    return result.count;
  }

  async searchPosts(query: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]> {
    const searchTerm = `%${query}%`;
    let dbQuery = db.select().from(posts)
      .where(or(
        ilike(posts.title, searchTerm),
        ilike(posts.content, searchTerm),
        ilike(posts.excerpt, searchTerm),
      ))
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .$dynamic();

    if (options?.limit) dbQuery = dbQuery.limit(options.limit);
    if (options?.offset) dbQuery = dbQuery.offset(options.offset);

    const rawPosts = await dbQuery;
    return enrichPostsWithRelations(rawPosts);
  }

  async searchPostCount(query: string): Promise<number> {
    const searchTerm = `%${query}%`;
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(or(
        ilike(posts.title, searchTerm),
        ilike(posts.content, searchTerm),
        ilike(posts.excerpt, searchTerm),
      ));
    return result.count;
  }

  async createPost(data: InsertPost, categoryIds?: number[], tagIds?: number[]): Promise<PostWithRelations> {
    const [post] = await db.insert(posts).values({
      ...data,
      updatedAt: new Date(),
    }).returning();

    if (categoryIds && categoryIds.length > 0) {
      await db.insert(postCategories).values(
        categoryIds.map(categoryId => ({ postId: post.id, categoryId }))
      );
    }
    if (tagIds && tagIds.length > 0) {
      await db.insert(postTags).values(
        tagIds.map(tagId => ({ postId: post.id, tagId }))
      );
    }

    return (await this.getPost(post.id))!;
  }

  async updatePost(id: number, data: Partial<InsertPost>, categoryIds?: number[], tagIds?: number[]): Promise<PostWithRelations | undefined> {
    const [post] = await db.update(posts).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(posts.id, id)).returning();

    if (!post) return undefined;

    if (categoryIds !== undefined) {
      await db.delete(postCategories).where(eq(postCategories.postId, id));
      if (categoryIds.length > 0) {
        await db.insert(postCategories).values(
          categoryIds.map(categoryId => ({ postId: id, categoryId }))
        );
      }
    }

    if (tagIds !== undefined) {
      await db.delete(postTags).where(eq(postTags.postId, id));
      if (tagIds.length > 0) {
        await db.insert(postTags).values(
          tagIds.map(tagId => ({ postId: id, tagId }))
        );
      }
    }

    return (await this.getPost(id))!;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id)).returning();
    return result.length > 0;
  }

  async incrementViewCount(id: number): Promise<void> {
    await db.update(posts).set({ viewCount: sql`${posts.viewCount} + 1` }).where(eq(posts.id, id));
    await db.insert(postViews).values({ postId: id });
  }

  async getViewsTimeSeries(startDate: Date, endDate: Date, postId?: number): Promise<{ date: string; views: number }[]> {
    const conditions = [
      gte(postViews.viewedAt, startDate),
      lte(postViews.viewedAt, endDate),
    ];
    if (postId) conditions.push(eq(postViews.postId, postId));

    const rows = await db.select({
      date: sql<string>`date_trunc('day', ${postViews.viewedAt})::date::text`,
      views: sql<number>`count(*)::int`,
    })
      .from(postViews)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('day', ${postViews.viewedAt})::date`)
      .orderBy(sql`date_trunc('day', ${postViews.viewedAt})::date`);

    return rows;
  }

  async getViewsTimeSeriesMonthly(startDate: Date, endDate: Date, postId?: number): Promise<{ date: string; views: number }[]> {
    const conditions = [
      gte(postViews.viewedAt, startDate),
      lte(postViews.viewedAt, endDate),
    ];
    if (postId) conditions.push(eq(postViews.postId, postId));

    const rows = await db.select({
      date: sql<string>`to_char(date_trunc('month', ${postViews.viewedAt}), 'YYYY-MM')`,
      views: sql<number>`count(*)::int`,
    })
      .from(postViews)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('month', ${postViews.viewedAt})`)
      .orderBy(sql`date_trunc('month', ${postViews.viewedAt})`);

    return rows;
  }

  async getViewsTimeSeriesHourly(startDate: Date, endDate: Date, postId?: number): Promise<{ date: string; views: number }[]> {
    const conditions = [
      gte(postViews.viewedAt, startDate),
      lte(postViews.viewedAt, endDate),
    ];
    if (postId) conditions.push(eq(postViews.postId, postId));

    const rows = await db.select({
      date: sql<string>`to_char(date_trunc('hour', ${postViews.viewedAt}), 'YYYY-MM-DD HH24:00')`,
      views: sql<number>`count(*)::int`,
    })
      .from(postViews)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('hour', ${postViews.viewedAt})`)
      .orderBy(sql`date_trunc('hour', ${postViews.viewedAt})`);

    return rows;
  }

  async getPostViewsSummary(startDate: Date, endDate: Date, sortDir: 'asc' | 'desc' = 'desc'): Promise<{ postId: number; title: string; slug: string; views: number }[]> {
    const rows = await db.select({
      postId: postViews.postId,
      title: posts.title,
      slug: posts.slug,
      views: sql<number>`count(*)::int`,
    })
      .from(postViews)
      .innerJoin(posts, eq(postViews.postId, posts.id))
      .where(and(
        gte(postViews.viewedAt, startDate),
        lte(postViews.viewedAt, endDate),
      ))
      .groupBy(postViews.postId, posts.title, posts.slug)
      .orderBy(sortDir === 'desc' ? desc(sql`count(*)`) : asc(sql`count(*)`));

    return rows;
  }

  async getTotalViews(startDate: Date, endDate: Date, postId?: number): Promise<number> {
    const conditions = [
      gte(postViews.viewedAt, startDate),
      lte(postViews.viewedAt, endDate),
    ];
    if (postId) conditions.push(eq(postViews.postId, postId));

    const [result] = await db.select({
      total: sql<number>`count(*)::int`,
    })
      .from(postViews)
      .where(and(...conditions));
    return result?.total || 0;
  }

  async getBanners(slot?: string): Promise<Banner[]> {
    if (slot) {
      return db.select().from(banners).where(and(eq(banners.slot, slot), eq(banners.isActive, true))).orderBy(asc(banners.sortOrder));
    }
    return db.select().from(banners).orderBy(asc(banners.sortOrder));
  }

  async getBanner(id: number): Promise<Banner | undefined> {
    const [b] = await db.select().from(banners).where(eq(banners.id, id));
    return b;
  }

  async createBanner(data: InsertBanner): Promise<Banner> {
    const [b] = await db.insert(banners).values(data).returning();
    return b;
  }

  async updateBanner(id: number, data: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [b] = await db.update(banners).set(data).where(eq(banners.id, id)).returning();
    return b;
  }

  async deleteBanner(id: number): Promise<boolean> {
    const result = await db.delete(banners).where(eq(banners.id, id)).returning();
    return result.length > 0;
  }

  async getFreeMaterials(): Promise<FreeMaterial[]> {
    return db.select().from(freeMaterials).where(eq(freeMaterials.isActive, true)).orderBy(asc(freeMaterials.sortOrder));
  }

  async getFreeMaterial(id: number): Promise<FreeMaterial | undefined> {
    const [m] = await db.select().from(freeMaterials).where(eq(freeMaterials.id, id));
    return m;
  }

  async createFreeMaterial(data: InsertFreeMaterial): Promise<FreeMaterial> {
    const [m] = await db.insert(freeMaterials).values(data).returning();
    return m;
  }

  async updateFreeMaterial(id: number, data: Partial<InsertFreeMaterial>): Promise<FreeMaterial | undefined> {
    const [m] = await db.update(freeMaterials).set(data).where(eq(freeMaterials.id, id)).returning();
    return m;
  }

  async deleteFreeMaterial(id: number): Promise<boolean> {
    const result = await db.delete(freeMaterials).where(eq(freeMaterials.id, id)).returning();
    return result.length > 0;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [s] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return s?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value } });
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(siteSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async getHomePageData(): Promise<any> {
    const settings = await this.getAllSettings();
    const allCategories = await this.getCategories();

    const recentPosts = await this.getPosts({ status: "published", limit: 4 });

    const sidebarBanners = await this.getBanners("sidebar");
    const horizontalBanners = await this.getBanners("horizontal");

    const featuredCategorySlug = settings["featured_category_slug"] || "";
    let featuredCategoryPosts: PostWithRelations[] = [];
    let featuredCategory: Category | undefined;
    if (featuredCategorySlug) {
      featuredCategory = await this.getCategoryBySlug(featuredCategorySlug);
      if (featuredCategory) {
        featuredCategoryPosts = await this.getPostsByCategory(featuredCategorySlug, { limit: 4 });
      }
    }

    const mostReadRaw = await db.select().from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.viewCount), desc(posts.publishedAt))
      .limit(9);
    const mostRead = await enrichPostsWithRelations(mostReadRaw);

    const diverseCatSlugs = (settings["diverse_category_slugs"] || "").split(",").filter(Boolean);
    const diverseSections: { category: Category; posts: PostWithRelations[] }[] = [];
    for (const slug of diverseCatSlugs.slice(0, 3)) {
      const cat = await this.getCategoryBySlug(slug.trim());
      if (cat) {
        const catPosts = await this.getPostsByCategory(slug.trim(), { limit: 4 });
        diverseSections.push({ category: cat, posts: catPosts });
      }
    }

    const row1Slug = settings["row_section_1_slug"] || "";
    const row2Slug = settings["row_section_2_slug"] || "";
    let rowSection1: { category: Category; posts: PostWithRelations[] } | null = null;
    let rowSection2: { category: Category; posts: PostWithRelations[] } | null = null;
    if (row1Slug) {
      const cat = await this.getCategoryBySlug(row1Slug);
      if (cat) rowSection1 = { category: cat, posts: await this.getPostsByCategory(row1Slug, { limit: 3 }) };
    }
    if (row2Slug) {
      const cat = await this.getCategoryBySlug(row2Slug);
      if (cat) rowSection2 = { category: cat, posts: await this.getPostsByCategory(row2Slug, { limit: 3 }) };
    }

    const materials = await this.getFreeMaterials();

    const randomRaw = await db.select().from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(sql`RANDOM()`)
      .limit(6);
    const randomPosts = await enrichPostsWithRelations(randomRaw);

    return {
      settings,
      categories: allCategories,
      recentPosts,
      sidebarBanners,
      horizontalBanners,
      featuredCategory: featuredCategory || null,
      featuredCategoryPosts,
      mostRead,
      diverseSections,
      rowSection1,
      rowSection2,
      randomPosts,
      materials,
    };
  }

  async getMostReadByCategory(categoryId: number, excludePostId: number, limit = 3): Promise<PostWithRelations[]> {
    const postIdsInCategory = await db.select({ postId: postCategories.postId })
      .from(postCategories)
      .where(eq(postCategories.categoryId, categoryId));
    const ids = postIdsInCategory.map(r => r.postId).filter(id => id !== excludePostId);
    if (ids.length === 0) return [];
    const rawPosts = await db.select().from(posts)
      .where(and(inArray(posts.id, ids), eq(posts.status, "published")))
      .orderBy(desc(posts.viewCount), desc(posts.publishedAt))
      .limit(limit);
    return enrichPostsWithRelations(rawPosts);
  }

  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return db.select().from(comments)
      .where(and(eq(comments.postId, postId), eq(comments.isApproved, true)))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
