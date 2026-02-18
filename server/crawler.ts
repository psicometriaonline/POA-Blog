import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export interface CrawledPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string | null;
  authorName: string | null;
  publishedAt: string | null;
  categories: string[];
  tags: string[];
  sourceUrl: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function crawlWordPressPost(url: string): Promise<CrawledPost> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BlogCrawler/1.0)",
    },
  });

  const $ = cheerio.load(response.data);

  const title = $("h1.entry-title, h1.post-title, .entry-header h1, article h1, h1").first().text().trim()
    || $("title").text().split("|")[0].split("-")[0].trim()
    || "Untitled";

  const slug = slugify(title);

  const contentEl = $(".entry-content, .post-content, article .content, .single-content, .post-body").first();
  
  contentEl.find("script, style, .sharedaddy, .jp-relatedposts, .post-navigation, nav, .comments-area").remove();
  
  const contentHtml = contentEl.html() || "";
  const content = contentHtml;

  const textContent = contentEl.text().trim();
  const excerpt = textContent.substring(0, 300).replace(/\s+/g, " ").trim() + (textContent.length > 300 ? "..." : "");

  const featuredImage = $("meta[property='og:image']").attr("content")
    || $(".post-thumbnail img, .wp-post-image, article img").first().attr("src")
    || null;

  const authorName = $(".author-name, .entry-author, .post-author a, meta[name='author']").first().text().trim()
    || $("meta[name='author']").attr("content")
    || null;

  const publishedMeta = $("meta[property='article:published_time']").attr("content")
    || $("time[datetime]").first().attr("datetime")
    || null;

  const categoriesSet = new Set<string>();
  $("a[rel='category tag'], .cat-links a, .entry-categories a, .post-categories a, a[rel='category']").each((_, el) => {
    const name = $(el).text().trim();
    if (name) categoriesSet.add(name);
  });

  const tagsSet = new Set<string>();
  $("a[rel='tag'], .tag-links a, .entry-tags a, .post-tags a, .tags-links a").each((_, el) => {
    const name = $(el).text().trim();
    if (name && !categoriesSet.has(name)) tagsSet.add(name);
  });

  return {
    title,
    slug,
    content,
    excerpt,
    featuredImage,
    authorName: authorName || null,
    publishedAt: publishedMeta,
    categories: Array.from(categoriesSet),
    tags: Array.from(tagsSet),
    sourceUrl: url,
  };
}

export async function crawlMultipleUrls(urls: string[]): Promise<{ success: CrawledPost[]; errors: { url: string; error: string }[] }> {
  const success: CrawledPost[] = [];
  const errors: { url: string; error: string }[] = [];

  for (const url of urls) {
    try {
      const post = await crawlWordPressPost(url.trim());
      success.push(post);
    } catch (err: any) {
      errors.push({ url, error: err.message || "Unknown error" });
    }
  }

  return { success, errors };
}
