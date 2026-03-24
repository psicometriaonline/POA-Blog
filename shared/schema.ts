import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export { users, sessions } from "./models/auth";
export type { User, UpsertUser } from "./models/auth";

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
});

export const tags = pgTable("tags", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const authors = pgTable("authors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  photo: text("photo"),
  bio: text("bio"),
});

export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  featuredImage: text("featured_image"),
  status: text("status").notNull().default("draft"),
  authorId: integer("author_id").references(() => authors.id, { onDelete: "set null" }),
  authorName: text("author_name"),
  sourceUrl: text("source_url"),
  viewCount: integer("view_count").notNull().default(0),
  disabledContainers: text("disabled_containers"),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  focusKeyword: text("focus_keyword"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("posts_status_idx").on(table.status),
  index("posts_published_at_idx").on(table.publishedAt),
  index("posts_status_published_at_idx").on(table.status, table.publishedAt),
]);

export const postCategories = pgTable("post_categories", {
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.postId, t.categoryId] })]);

export const postTags = pgTable("post_tags", {
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.postId, t.tagId] })]);

export const postsRelations = relations(posts, ({ many }) => ({
  postCategories: many(postCategories),
  postTags: many(postTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.postId], references: [posts.id] }),
  category: one(categories, { fields: [postCategories.categoryId], references: [categories.id] }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const BANNER_SLOTS: Record<string, string> = {
  home_sidebar_recent_1: "Home — Sidebar Posts Recentes (1)",
  home_sidebar_recent_2: "Home — Sidebar Posts Recentes (2)",
  home_sidebar_categories: "Home — Sidebar Categorias",
  home_horizontal: "Home — Banner Horizontal",
  post_sidebar: "Post — Sidebar",
  post_academy_form: "Post — Academy Form",
  category_academy_form: "Categorias — Academy Form",
  tag_academy_form: "Tags — Academy Form",
};

export const banners = pgTable("banners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  slot: text("slot").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  buttonText: text("button_text"),
  buttonColor: text("button_color"),
  buttonAlignment: text("button_alignment"),
  showButton: boolean("show_button").notNull().default(false),
  titleAlignment: text("title_alignment").notNull().default("left"),
  titleFontSize: integer("title_font_size").notNull().default(18),
  buttonFontSize: integer("button_font_size").notNull().default(14),
  showTitle: boolean("show_title").notNull().default(true),
  buttonPosX: integer("button_pos_x").notNull().default(0),
  buttonPosY: integer("button_pos_y").notNull().default(0),
});

export const freeMaterials = pgTable("free_materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  isSpam: boolean("is_spam").notNull().default(false),
  parentId: integer("parent_id"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postViews = pgTable("post_views", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  visitorId: text("visitor_id"),
  referrer: text("referrer"),
});

export const imageGroups = pgTable("image_groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
});

export const imageBankItems = pgTable("image_bank_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id").notNull().references(() => imageGroups.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  title: text("title"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const containerRules = pgTable("container_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  containerType: text("container_type").notNull(),
  criteriaType: text("criteria_type").notNull(),
  criteriaValue: text("criteria_value"),
  imageGroupId: integer("image_group_id").notNull().references(() => imageGroups.id, { onDelete: "cascade" }),
  maxImages: integer("max_images").notNull().default(3),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  linkUrl: text("link_url"),
});

export const imageGroupsRelations = relations(imageGroups, ({ many }) => ({
  items: many(imageBankItems),
  rules: many(containerRules),
}));

export const imageBankItemsRelations = relations(imageBankItems, ({ one }) => ({
  group: one(imageGroups, { fields: [imageBankItems.groupId], references: [imageGroups.id] }),
}));

export const containerRulesRelations = relations(containerRules, ({ one }) => ({
  imageGroup: one(imageGroups, { fields: [containerRules.imageGroupId], references: [imageGroups.id] }),
}));

export const mediaLibrary = pgTable("media_library", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  altText: text("alt_text"),
  title: text("title"),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),
  source: text("source").notNull().default("upload"),
  data: text("data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name"),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("hero"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const brokenLinks = pgTable("broken_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  url: text("url").notNull(),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  pageType: text("page_type").notNull(),
  pageSlug: text("page_slug"),
  pageTitle: text("page_title"),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertAuthorSchema = createInsertSchema(authors).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBannerSchema = createInsertSchema(banners).omit({ id: true });
export const insertFreeMaterialSchema = createInsertSchema(freeMaterials).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertImageGroupSchema = createInsertSchema(imageGroups).omit({ id: true });
export const insertImageBankItemSchema = createInsertSchema(imageBankItems).omit({ id: true });
export const insertContainerRuleSchema = createInsertSchema(containerRules).omit({ id: true });
export const insertMediaSchema = createInsertSchema(mediaLibrary).omit({ id: true, createdAt: true });
export const insertSubscriberSchema = createInsertSchema(subscribers).omit({ id: true, createdAt: true });

export type Author = typeof authors.$inferSelect;
export type InsertAuthor = z.infer<typeof insertAuthorSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type FreeMaterial = typeof freeMaterials.$inferSelect;
export type InsertFreeMaterial = z.infer<typeof insertFreeMaterialSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type ImageGroup = typeof imageGroups.$inferSelect;
export type InsertImageGroup = z.infer<typeof insertImageGroupSchema>;
export type ImageBankItem = typeof imageBankItems.$inferSelect;
export type InsertImageBankItem = z.infer<typeof insertImageBankItemSchema>;
export type ContainerRule = typeof containerRules.$inferSelect;
export type InsertContainerRule = z.infer<typeof insertContainerRuleSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type BrokenLink = typeof brokenLinks.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type MediaItem = typeof mediaLibrary.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

export type ImageGroupWithItems = ImageGroup & {
  items: ImageBankItem[];
};

export type ContainerRuleWithGroup = ContainerRule & {
  imageGroup: ImageGroup;
};

export type PostWithRelations = Post & {
  categories: Category[];
  tags: Tag[];
  author?: Author | null;
};
