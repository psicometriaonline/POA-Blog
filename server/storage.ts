import {
  type Author, type InsertAuthor,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type Post, type InsertPost,
  type PostWithRelations,
  type Banner, type InsertBanner,
  type FreeMaterial, type InsertFreeMaterial,
  type Comment, type InsertComment,
  type ImageGroup, type InsertImageGroup, type ImageGroupWithItems,
  type ImageBankItem, type InsertImageBankItem,
  type ContainerRule, type InsertContainerRule, type ContainerRuleWithGroup,
  type MediaItem, type InsertMedia,
  authors, categories, tags, posts, postCategories, postTags,
  banners, freeMaterials, siteSettings, comments, postViews,
  imageGroups, imageBankItems, containerRules, mediaLibrary,
} from "@shared/schema";
import { db } from "./db";
import { eq, ne, ilike, or, desc, sql, inArray, and, asc, gte, lte, count, isNull } from "drizzle-orm";

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
  getPostsWithOnlyCategory(categoryId: number): Promise<number[]>;

  getTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  createTag(data: InsertTag): Promise<Tag>;
  updateTag(id: number, data: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;
  getPostsWithOnlyTag(tagId: number): Promise<number[]>;
  countPostsInCategory(categoryId: number): Promise<number>;
  countPostsInTag(tagId: number): Promise<number>;

  getPosts(options?: { status?: string; limit?: number; offset?: number; search?: string }): Promise<PostWithRelations[]>;
  getPostCount(status?: string, search?: string): Promise<number>;
  getPost(id: number): Promise<PostWithRelations | undefined>;
  getPostBySlug(slug: string): Promise<PostWithRelations | undefined>;
  getPostsByCategory(categorySlug: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]>;
  getPostCountByCategory(categorySlug: string): Promise<number>;
  getPostsByTag(tagSlug: string, options?: { limit?: number; offset?: number }): Promise<PostWithRelations[]>;
  getPostCountByTag(tagSlug: string): Promise<number>;
  searchPosts(query: string, options?: { limit?: number; offset?: number; searchIn?: string; categoryId?: number; tagId?: number; dateFrom?: string; dateTo?: string; sort?: string }): Promise<PostWithRelations[]>;
  searchPostCount(query: string, options?: { searchIn?: string; categoryId?: number; tagId?: number; dateFrom?: string; dateTo?: string }): Promise<number>;
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

  getImageGroups(): Promise<ImageGroup[]>;
  getImageGroupsWithItems(): Promise<ImageGroupWithItems[]>;
  getImageGroup(id: number): Promise<ImageGroup | undefined>;
  createImageGroup(data: InsertImageGroup): Promise<ImageGroup>;
  updateImageGroup(id: number, data: Partial<InsertImageGroup>): Promise<ImageGroup | undefined>;
  deleteImageGroup(id: number): Promise<boolean>;

  getImageBankItems(groupId?: number): Promise<ImageBankItem[]>;
  getImageBankItem(id: number): Promise<ImageBankItem | undefined>;
  createImageBankItem(data: InsertImageBankItem): Promise<ImageBankItem>;
  updateImageBankItem(id: number, data: Partial<InsertImageBankItem>): Promise<ImageBankItem | undefined>;
  deleteImageBankItem(id: number): Promise<boolean>;

  getContainerRules(containerType?: string): Promise<ContainerRuleWithGroup[]>;
  getContainerRule(id: number): Promise<ContainerRule | undefined>;
  createContainerRule(data: InsertContainerRule): Promise<ContainerRule>;
  updateContainerRule(id: number, data: Partial<InsertContainerRule>): Promise<ContainerRule | undefined>;
  deleteContainerRule(id: number): Promise<boolean>;

  getContainerImagesForPost(postId: number): Promise<{ images: ImageBankItem[]; rule: ContainerRule }[]>;
  getMatchingPostsForRule(ruleId: number): Promise<{ count: number; posts: { id: number; title: string; slug: string }[] }>;
  removeManualBannersFromPosts(dryRun: boolean): Promise<{ totalPosts: number; totalBanners: number; details: { postId: number; title: string; count: number; bannerUrls: string[] }[] }>;
  removeBareBannersFromPosts(dryRun: boolean): Promise<{ totalPosts: number; totalBanners: number; details: { postId: number; title: string; count: number; bannerUrls: string[] }[] }>;

  listMedia(options: { search?: string; page?: number; limit?: number; sort?: string }): Promise<{ items: MediaItem[]; total: number }>;
  getMedia(id: number): Promise<MediaItem | undefined>;
  createMedia(data: InsertMedia): Promise<MediaItem>;
  deleteMedia(id: number): Promise<boolean>;
  getMediaUsage(id: number): Promise<{ postId: number; title: string; slug: string; usage: string }[]>;
  getMediaStats(): Promise<{ total: number; totalSize: number; bySource: { source: string; count: number }[] }>;
  findDuplicateMedia(): Promise<{ filename: string; items: MediaItem[] }[]>;
  updateMediaFileSize(id: number, fileSize: number): Promise<void>;
  updateMediaFilename(id: number, filename: string): Promise<void>;
  getMediaByFilename(filename: string, excludeId: number): Promise<MediaItem | undefined>;
  getMediaWithNullFileSize(limit: number): Promise<MediaItem[]>;
  updateMediaUrl(id: number, url: string, fileSize?: number): Promise<void>;
  replaceUrlInAllPosts(oldUrl: string, newUrl: string): Promise<number>;
  unifyMediaInPosts(keepUrl: string, removeUrl: string): Promise<number>;

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

  async getPostsWithOnlyCategory(categoryId: number): Promise<number[]> {
    const result = await db.execute(sql`
      SELECT pc.post_id FROM post_categories pc
      WHERE pc.category_id = ${categoryId}
      AND NOT EXISTS (
        SELECT 1 FROM post_categories pc2
        WHERE pc2.post_id = pc.post_id AND pc2.category_id != ${categoryId}
      )
    `);
    return (result.rows as any[]).map(r => r.post_id);
  }

  async countPostsInCategory(categoryId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(postCategories).where(eq(postCategories.categoryId, categoryId));
    return result.count;
  }

  async countPostsInTag(tagId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(postTags).where(eq(postTags.tagId, tagId));
    return result.count;
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

  async getPostsWithOnlyTag(tagId: number): Promise<number[]> {
    const result = await db.execute(sql`
      SELECT pt.post_id FROM post_tags pt
      WHERE pt.tag_id = ${tagId}
      AND NOT EXISTS (
        SELECT 1 FROM post_tags pt2
        WHERE pt2.post_id = pt.post_id AND pt2.tag_id != ${tagId}
      )
    `);
    return (result.rows as any[]).map(r => r.post_id);
  }

  async getPosts(options?: { status?: string; limit?: number; offset?: number; search?: string }): Promise<PostWithRelations[]> {
    let query = db.select().from(posts).orderBy(desc(posts.publishedAt), desc(posts.createdAt)).$dynamic();

    const conditions = [];
    if (options?.status) conditions.push(eq(posts.status, options.status));
    if (options?.search) conditions.push(ilike(posts.title, `%${options.search}%`));
    if (conditions.length > 0) query = query.where(and(...conditions));

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    const rawPosts = await query;
    return enrichPostsWithRelations(rawPosts);
  }

  async getPostCount(status?: string, search?: string): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)::int` }).from(posts).$dynamic();
    const conditions = [];
    if (status) conditions.push(eq(posts.status, status));
    if (search) conditions.push(ilike(posts.title, `%${search}%`));
    if (conditions.length > 0) query = query.where(and(...conditions));
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

  private buildSearchConditions(query: string, options?: { searchIn?: string; categoryId?: number; tagId?: number; dateFrom?: string; dateTo?: string }) {
    const searchTerm = `%${query}%`;
    const conditions: any[] = [];

    const searchIn = options?.searchIn || "all";
    if (searchIn === "title") {
      conditions.push(ilike(posts.title, searchTerm));
    } else if (searchIn === "content") {
      conditions.push(or(ilike(posts.content, searchTerm), ilike(posts.excerpt, searchTerm)));
    } else {
      conditions.push(or(ilike(posts.title, searchTerm), ilike(posts.content, searchTerm), ilike(posts.excerpt, searchTerm)));
    }

    if (options?.dateFrom) {
      conditions.push(gte(posts.publishedAt, new Date(options.dateFrom)));
    }
    if (options?.dateTo) {
      const endDate = new Date(options.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(posts.publishedAt, endDate));
    }

    return conditions;
  }

  private buildSearchQuery(options?: { categoryId?: number; tagId?: number }) {
    let baseQuery = db.select({ id: posts.id }).from(posts).$dynamic();
    if (options?.categoryId) {
      baseQuery = baseQuery.innerJoin(postCategories, and(eq(postCategories.postId, posts.id), eq(postCategories.categoryId, options.categoryId)));
    }
    if (options?.tagId) {
      baseQuery = baseQuery.innerJoin(postTags, and(eq(postTags.postId, posts.id), eq(postTags.tagId, options.tagId)));
    }
    return baseQuery;
  }

  private buildRelevanceScore(query: string) {
    const lowerQuery = query.toLowerCase();
    return sql<number>`(
      CASE WHEN LOWER(${posts.title}) = ${lowerQuery} THEN 100
           WHEN LOWER(${posts.title}) LIKE ${lowerQuery + '%'} THEN 80
           WHEN LOWER(${posts.title}) LIKE ${'%' + lowerQuery + '%'} THEN 60
           ELSE 0 END
      + CASE WHEN LOWER(${posts.excerpt}) LIKE ${'%' + lowerQuery + '%'} THEN 20 ELSE 0 END
      + CASE WHEN LOWER(${posts.content}) LIKE ${'%' + lowerQuery + '%'} THEN 5 ELSE 0 END
    )`;
  }

  async searchPosts(query: string, options?: { limit?: number; offset?: number; searchIn?: string; categoryId?: number; tagId?: number; dateFrom?: string; dateTo?: string; sort?: string }): Promise<PostWithRelations[]> {
    const conditions = this.buildSearchConditions(query, options);
    const sortOrder = options?.sort || "relevance";

    if (sortOrder === "relevance") {
      const relevanceScore = this.buildRelevanceScore(query);
      let baseQuery = db.select({ id: posts.id, score: relevanceScore.as("relevance_score") }).from(posts).$dynamic();
      if (options?.categoryId) {
        baseQuery = baseQuery.innerJoin(postCategories, and(eq(postCategories.postId, posts.id), eq(postCategories.categoryId, options.categoryId)));
      }
      if (options?.tagId) {
        baseQuery = baseQuery.innerJoin(postTags, and(eq(postTags.postId, posts.id), eq(postTags.tagId, options.tagId)));
      }
      baseQuery = baseQuery.where(and(...conditions)).orderBy(sql`relevance_score DESC`, desc(posts.publishedAt));
      if (options?.limit) baseQuery = baseQuery.limit(options.limit);
      if (options?.offset) baseQuery = baseQuery.offset(options.offset);

      const matchedIds = await baseQuery;
      if (matchedIds.length === 0) return [];

      const ids = matchedIds.map(r => r.id);
      const idOrder = new Map(ids.map((id, i) => [id, i]));
      const rawPosts = await db.select().from(posts).where(inArray(posts.id, ids));
      rawPosts.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
      return enrichPostsWithRelations(rawPosts);
    }

    let orderClause;
    if (sortOrder === "az") orderClause = [asc(posts.title)];
    else if (sortOrder === "za") orderClause = [desc(posts.title)];
    else if (sortOrder === "newest") orderClause = [desc(posts.publishedAt)];
    else orderClause = [asc(posts.publishedAt)];

    let dbQuery = this.buildSearchQuery(options);
    dbQuery = dbQuery.where(and(...conditions)).orderBy(...orderClause);

    if (options?.limit) dbQuery = dbQuery.limit(options.limit);
    if (options?.offset) dbQuery = dbQuery.offset(options.offset);

    const matchedIds = await dbQuery;
    if (matchedIds.length === 0) return [];

    const ids = matchedIds.map(r => r.id);
    const rawPosts = await db.select().from(posts).where(inArray(posts.id, ids)).orderBy(...orderClause);
    return enrichPostsWithRelations(rawPosts);
  }

  async searchPostCount(query: string, options?: { searchIn?: string; categoryId?: number; tagId?: number; dateFrom?: string; dateTo?: string }): Promise<number> {
    const conditions = this.buildSearchConditions(query, options);
    let baseQuery = db.select({ count: sql<number>`count(DISTINCT ${posts.id})::int` }).from(posts).$dynamic();
    if (options?.categoryId) {
      baseQuery = baseQuery.innerJoin(postCategories, and(eq(postCategories.postId, posts.id), eq(postCategories.categoryId, options.categoryId)));
    }
    if (options?.tagId) {
      baseQuery = baseQuery.innerJoin(postTags, and(eq(postTags.postId, posts.id), eq(postTags.tagId, options.tagId)));
    }
    const [result] = await baseQuery.where(and(...conditions));
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

  async getImageGroups(): Promise<ImageGroup[]> {
    return db.select().from(imageGroups).orderBy(imageGroups.name);
  }

  async getImageGroupsWithItems(): Promise<ImageGroupWithItems[]> {
    const groups = await db.select().from(imageGroups).orderBy(imageGroups.name);
    if (groups.length === 0) return [];
    const groupIds = groups.map(g => g.id);
    const items = await db.select().from(imageBankItems)
      .where(inArray(imageBankItems.groupId, groupIds))
      .orderBy(asc(imageBankItems.sortOrder));
    return groups.map(g => ({
      ...g,
      items: items.filter(i => i.groupId === g.id),
    }));
  }

  async getImageGroup(id: number): Promise<ImageGroup | undefined> {
    const [g] = await db.select().from(imageGroups).where(eq(imageGroups.id, id));
    return g;
  }

  async createImageGroup(data: InsertImageGroup): Promise<ImageGroup> {
    const [g] = await db.insert(imageGroups).values(data).returning();
    return g;
  }

  async updateImageGroup(id: number, data: Partial<InsertImageGroup>): Promise<ImageGroup | undefined> {
    const [g] = await db.update(imageGroups).set(data).where(eq(imageGroups.id, id)).returning();
    return g;
  }

  async deleteImageGroup(id: number): Promise<boolean> {
    const result = await db.delete(imageGroups).where(eq(imageGroups.id, id)).returning();
    return result.length > 0;
  }

  async getImageBankItems(groupId?: number): Promise<ImageBankItem[]> {
    if (groupId) {
      return db.select().from(imageBankItems)
        .where(eq(imageBankItems.groupId, groupId))
        .orderBy(asc(imageBankItems.sortOrder));
    }
    return db.select().from(imageBankItems).orderBy(asc(imageBankItems.sortOrder));
  }

  async getImageBankItem(id: number): Promise<ImageBankItem | undefined> {
    const [item] = await db.select().from(imageBankItems).where(eq(imageBankItems.id, id));
    return item;
  }

  async createImageBankItem(data: InsertImageBankItem): Promise<ImageBankItem> {
    const [item] = await db.insert(imageBankItems).values(data).returning();
    return item;
  }

  async updateImageBankItem(id: number, data: Partial<InsertImageBankItem>): Promise<ImageBankItem | undefined> {
    const [item] = await db.update(imageBankItems).set(data).where(eq(imageBankItems.id, id)).returning();
    return item;
  }

  async deleteImageBankItem(id: number): Promise<boolean> {
    const result = await db.delete(imageBankItems).where(eq(imageBankItems.id, id)).returning();
    return result.length > 0;
  }

  async getContainerRules(containerType?: string): Promise<ContainerRuleWithGroup[]> {
    let query = db.select().from(containerRules).orderBy(desc(containerRules.priority)).$dynamic();
    if (containerType) {
      query = query.where(eq(containerRules.containerType, containerType));
    }
    const rules = await query;
    if (rules.length === 0) return [];
    const groupIds = [...new Set(rules.map(r => r.imageGroupId))];
    const groups = await db.select().from(imageGroups).where(inArray(imageGroups.id, groupIds));
    const groupMap = new Map(groups.map(g => [g.id, g]));
    return rules.map(r => ({
      ...r,
      imageGroup: groupMap.get(r.imageGroupId)!,
    }));
  }

  async getContainerRule(id: number): Promise<ContainerRule | undefined> {
    const [r] = await db.select().from(containerRules).where(eq(containerRules.id, id));
    return r;
  }

  async createContainerRule(data: InsertContainerRule): Promise<ContainerRule> {
    const [r] = await db.insert(containerRules).values(data).returning();
    return r;
  }

  async updateContainerRule(id: number, data: Partial<InsertContainerRule>): Promise<ContainerRule | undefined> {
    const [r] = await db.update(containerRules).set(data).where(eq(containerRules.id, id)).returning();
    return r;
  }

  async deleteContainerRule(id: number): Promise<boolean> {
    const result = await db.delete(containerRules).where(eq(containerRules.id, id)).returning();
    return result.length > 0;
  }

  async getMatchingPostsForRule(ruleId: number): Promise<{ count: number; posts: { id: number; title: string; slug: string }[] }> {
    const [rule] = await db.select().from(containerRules).where(eq(containerRules.id, ruleId));
    if (!rule) return { count: 0, posts: [] };

    let matchingPosts: { id: number; title: string; slug: string }[];

    if (rule.criteriaType === "all") {
      const rows = await db.select({ id: posts.id, title: posts.title, slug: posts.slug })
        .from(posts)
        .where(eq(posts.status, "published"))
        .orderBy(desc(posts.publishedAt));
      matchingPosts = rows;
    } else if (rule.criteriaType === "category" && rule.criteriaValue) {
      const [cat] = await db.select().from(categories).where(eq(categories.slug, rule.criteriaValue));
      if (!cat) return { count: 0, posts: [] };
      const rows = await db.select({ id: posts.id, title: posts.title, slug: posts.slug })
        .from(posts)
        .innerJoin(postCategories, eq(posts.id, postCategories.postId))
        .where(and(eq(postCategories.categoryId, cat.id), eq(posts.status, "published")))
        .orderBy(desc(posts.publishedAt));
      matchingPosts = rows;
    } else if (rule.criteriaType === "tag" && rule.criteriaValue) {
      const [tag] = await db.select().from(tags).where(eq(tags.slug, rule.criteriaValue));
      if (!tag) return { count: 0, posts: [] };
      const rows = await db.select({ id: posts.id, title: posts.title, slug: posts.slug })
        .from(posts)
        .innerJoin(postTags, eq(posts.id, postTags.postId))
        .where(and(eq(postTags.tagId, tag.id), eq(posts.status, "published")))
        .orderBy(desc(posts.publishedAt));
      matchingPosts = rows;
    } else {
      return { count: 0, posts: [] };
    }

    return { count: matchingPosts.length, posts: matchingPosts };
  }

  async getContainerImagesForPost(postId: number): Promise<{ images: ImageBankItem[]; rule: ContainerRule }[]> {
    const post = await this.getPost(postId);
    if (!post) return [];

    const categorySlugs = post.categories.map(c => c.slug);
    const tagSlugs = post.tags.map(t => t.slug);

    const allRules = await db.select().from(containerRules)
      .where(eq(containerRules.isActive, true))
      .orderBy(desc(containerRules.priority));

    const matchingRules = allRules.filter(rule => {
      if (rule.criteriaType === "all") return true;
      if (rule.criteriaType === "category" && rule.criteriaValue) {
        return categorySlugs.includes(rule.criteriaValue);
      }
      if (rule.criteriaType === "tag" && rule.criteriaValue) {
        return tagSlugs.includes(rule.criteriaValue);
      }
      return false;
    });

    if (matchingRules.length === 0) return [];

    const results: { images: ImageBankItem[]; rule: ContainerRule }[] = [];

    for (const rule of matchingRules) {
      const items = await db.select().from(imageBankItems)
        .where(and(
          eq(imageBankItems.groupId, rule.imageGroupId),
          eq(imageBankItems.isActive, true),
        ));

      if (items.length === 0) continue;

      const shuffled = items.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, rule.maxImages);
      results.push({ images: selected, rule });
    }

    return results;
  }

  async listMedia(options: { search?: string; page?: number; limit?: number; sort?: string }): Promise<{ items: MediaItem[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 30;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options.search) {
      const term = `%${options.search}%`;
      conditions.push(or(
        ilike(mediaLibrary.filename, term),
        ilike(mediaLibrary.title, term),
        ilike(mediaLibrary.altText, term),
      ));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause: any = desc(mediaLibrary.createdAt);
    if (options.sort) {
      switch (options.sort) {
        case "date_asc": orderByClause = asc(mediaLibrary.createdAt); break;
        case "name_asc": orderByClause = asc(mediaLibrary.filename); break;
        case "name_desc": orderByClause = desc(mediaLibrary.filename); break;
        case "size_desc": orderByClause = desc(mediaLibrary.fileSize); break;
        case "size_asc": orderByClause = asc(mediaLibrary.fileSize); break;
        case "date_desc": default: orderByClause = desc(mediaLibrary.createdAt); break;
      }
    }

    const [totalResult, items] = await Promise.all([
      db.select({ cnt: count() }).from(mediaLibrary).where(where),
      db.select().from(mediaLibrary).where(where)
        .orderBy(orderByClause)
        .limit(limit).offset(offset),
    ]);

    return { items, total: Number(totalResult[0]?.cnt || 0) };
  }

  async getMedia(id: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id));
    return item;
  }

  async createMedia(data: InsertMedia): Promise<MediaItem> {
    const [item] = await db.insert(mediaLibrary).values(data).returning();
    return item;
  }

  async deleteMedia(id: number): Promise<boolean> {
    const result = await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id)).returning();
    return result.length > 0;
  }

  async getMediaUsage(id: number): Promise<{ postId: number; title: string; slug: string; usage: string }[]> {
    const media = await this.getMedia(id);
    if (!media) return [];

    const allPosts = await db.select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      featuredImage: posts.featuredImage,
      content: posts.content,
    }).from(posts);

    const usages: { postId: number; title: string; slug: string; usage: string }[] = [];

    for (const post of allPosts) {
      const usageTypes: string[] = [];
      if (post.featuredImage && post.featuredImage === media.url) {
        usageTypes.push("imagem destacada");
      }
      if (post.content && post.content.includes(media.url)) {
        usageTypes.push("conteúdo");
      }
      if (usageTypes.length > 0) {
        usages.push({ postId: post.id, title: post.title, slug: post.slug, usage: usageTypes.join(", ") });
      }
    }

    return usages;
  }

  async getMediaStats(): Promise<{ total: number; totalSize: number; bySource: { source: string; count: number }[] }> {
    const [totalResult] = await db.select({
      total: count(),
      totalSize: sql<number>`COALESCE(SUM(${mediaLibrary.fileSize}), 0)`,
    }).from(mediaLibrary);

    const bySource = await db.select({
      source: mediaLibrary.source,
      count: count(),
    }).from(mediaLibrary).groupBy(mediaLibrary.source);

    return {
      total: Number(totalResult?.total || 0),
      totalSize: Number(totalResult?.totalSize || 0),
      bySource: bySource.map(s => ({ source: s.source, count: Number(s.count) })),
    };
  }

  async findDuplicateMedia(): Promise<{ filename: string; items: MediaItem[] }[]> {
    const dupeFilenames = await db.select({
      filename: mediaLibrary.filename,
      cnt: count(),
    }).from(mediaLibrary)
      .groupBy(mediaLibrary.filename)
      .having(sql`count(*) > 1`);

    const results: { filename: string; items: MediaItem[] }[] = [];
    for (const dupe of dupeFilenames) {
      const items = await db.select().from(mediaLibrary)
        .where(eq(mediaLibrary.filename, dupe.filename));
      results.push({ filename: dupe.filename, items });
    }
    return results;
  }

  async updateMediaFileSize(id: number, fileSize: number): Promise<void> {
    await db.update(mediaLibrary).set({ fileSize }).where(eq(mediaLibrary.id, id));
  }

  async updateMediaFilename(id: number, filename: string): Promise<void> {
    await db.update(mediaLibrary).set({ filename }).where(eq(mediaLibrary.id, id));
  }

  async getMediaByFilename(filename: string, excludeId: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaLibrary)
      .where(and(eq(mediaLibrary.filename, filename), ne(mediaLibrary.id, excludeId)))
      .limit(1);
    return item;
  }

  async getMediaWithNullFileSize(limit: number): Promise<MediaItem[]> {
    return db.select().from(mediaLibrary).where(isNull(mediaLibrary.fileSize)).limit(limit);
  }

  async updateMediaUrl(id: number, url: string, fileSize?: number): Promise<void> {
    const update: any = { url };
    if (fileSize !== undefined) update.fileSize = fileSize;
    await db.update(mediaLibrary).set(update).where(eq(mediaLibrary.id, id));
  }

  async replaceUrlInAllPosts(oldUrl: string, newUrl: string): Promise<number> {
    let updatedCount = 0;
    const featuredResult = await db.update(posts)
      .set({ featuredImage: newUrl })
      .where(eq(posts.featuredImage, oldUrl))
      .returning();
    updatedCount += featuredResult.length;

    const allPosts = await db.select({ id: posts.id, content: posts.content }).from(posts);
    for (const post of allPosts) {
      if (post.content && post.content.includes(oldUrl)) {
        const newContent = post.content.split(oldUrl).join(newUrl);
        await db.update(posts).set({ content: newContent }).where(eq(posts.id, post.id));
        updatedCount++;
      }
    }
    return updatedCount;
  }

  async unifyMediaInPosts(keepUrl: string, removeUrl: string): Promise<number> {
    let updatedCount = 0;
    
    // Update featured images
    const featuredResult = await db.update(posts)
      .set({ featuredImage: keepUrl })
      .where(eq(posts.featuredImage, removeUrl))
      .returning();
    updatedCount += featuredResult.length;

    // Update content HTML
    const allPosts = await db.select().from(posts);
    for (const post of allPosts) {
      if (post.content && post.content.includes(removeUrl)) {
        const newContent = post.content.split(removeUrl).join(keepUrl);
        await db.update(posts).set({ content: newContent }).where(eq(posts.id, post.id));
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  async removeManualBannersFromPosts(dryRun: boolean): Promise<{ totalPosts: number; totalBanners: number; details: { postId: number; title: string; count: number; bannerUrls: string[] }[] }> {
    const cheerio = await import("cheerio");
    const allPosts = await db.select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
    }).from(posts).where(eq(posts.status, "published"));

    const details: { postId: number; title: string; count: number; bannerUrls: string[] }[] = [];
    let totalBanners = 0;

    for (const post of allPosts) {
      if (!post.content) continue;

      const $ = cheerio.load(post.content, { xmlMode: false, decodeEntities: false });
      const bannersToRemove: { el: any; src: string }[] = [];

      $("figure").each((_, fig) => {
        const $fig = $(fig);
        if ($fig.find("figcaption").length > 0) return;
        const $link = $fig.find("a");
        if ($link.length === 0) return;
        const $img = $link.find("img");
        if ($img.length === 0) return;
        const href = $link.attr("href") || "";
        if (href.includes("jasp-stats.org")) return;
        const src = $img.attr("src") || "";
        bannersToRemove.push({ el: fig, src });
      });

      if (bannersToRemove.length === 0) continue;

      const bannerUrls = bannersToRemove.map(b => b.src);
      totalBanners += bannersToRemove.length;

      if (!dryRun) {
        bannersToRemove.forEach(b => $(b.el).remove());
        const newContent = $("body").html() || "";
        await db.update(posts).set({ content: newContent }).where(eq(posts.id, post.id));
      }

      details.push({
        postId: post.id,
        title: post.title,
        count: bannersToRemove.length,
        bannerUrls,
      });
    }

    return { totalPosts: details.length, totalBanners, details };
  }

  async removeBareBannersFromPosts(dryRun: boolean): Promise<{ totalPosts: number; totalBanners: number; details: { postId: number; title: string; count: number; bannerUrls: string[] }[] }> {
    const cheerio = await import("cheerio");
    const allPosts = await db.select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
    }).from(posts).where(eq(posts.status, "published"));

    const bannerPatterns = [/1024x240/i, /banner-naopare/i, /glossario-afe-banner/i];

    const details: { postId: number; title: string; count: number; bannerUrls: string[] }[] = [];
    let totalBanners = 0;

    for (const post of allPosts) {
      if (!post.content) continue;

      const $ = cheerio.load(post.content, { xmlMode: false, decodeEntities: false });
      const bannersToRemove: { el: any; src: string }[] = [];

      $("img").each((_, img) => {
        const $img = $(img);
        const src = $img.attr("src") || "";
        if (!bannerPatterns.some(p => p.test(src))) return;
        const $parent = $img.parent();
        if ($parent.is("figure") && $parent.find("figcaption").length > 0) return;
        if ($parent.is("a") && $parent.parent().is("figure") && $parent.parent().find("figcaption").length > 0) return;
        bannersToRemove.push({ el: img, src });
      });

      if (bannersToRemove.length === 0) continue;

      const bannerUrls = bannersToRemove.map(b => b.src);
      totalBanners += bannersToRemove.length;

      if (!dryRun) {
        bannersToRemove.forEach(b => {
          const $el = $(b.el);
          const $parent = $el.parent();
          if ($parent.is("figure") && $parent.find("figcaption").length === 0) {
            $parent.remove();
          } else {
            $el.remove();
          }
        });
        const newContent = $("body").html() || "";
        await db.update(posts).set({ content: newContent }).where(eq(posts.id, post.id));
      }

      details.push({
        postId: post.id,
        title: post.title,
        count: bannersToRemove.length,
        bannerUrls,
      });
    }

    return { totalPosts: details.length, totalBanners, details };
  }
}

export const storage = new DatabaseStorage();
