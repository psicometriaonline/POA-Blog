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

export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  featuredImage: text("featured_image"),
  status: text("status").notNull().default("draft"),
  authorName: text("author_name"),
  sourceUrl: text("source_url"),
  viewCount: integer("view_count").notNull().default(0),
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

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBannerSchema = createInsertSchema(banners).omit({ id: true });
export const insertFreeMaterialSchema = createInsertSchema(freeMaterials).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });

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
export type SiteSetting = typeof siteSettings.$inferSelect;

export type PostWithRelations = Post & {
  categories: Category[];
  tags: Tag[];
};
