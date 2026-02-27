import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
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
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const banners = pgTable("banners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  slot: text("slot").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
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
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postViews = pgTable("post_views", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
