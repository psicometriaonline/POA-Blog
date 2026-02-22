import axios from "axios";
import * as cheerio from "cheerio";

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

function extractBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

async function fetchWpApiCategoriesAndTags(
  baseUrl: string,
  postSlug: string
): Promise<{ categories: string[]; tags: string[] }> {
  try {
    const postRes = await axios.get(
      `${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(postSlug)}&_fields=categories,tags`,
      { timeout: 8000 }
    );

    if (!postRes.data?.[0]) return { categories: [], tags: [] };

    const post = postRes.data[0];
    const catIds: number[] = post.categories || [];
    const tagIds: number[] = post.tags || [];

    const categories: string[] = [];
    const tags: string[] = [];

    if (catIds.length > 0) {
      const catRes = await axios.get(
        `${baseUrl}/wp-json/wp/v2/categories?include=${catIds.join(",")}&_fields=name`,
        { timeout: 8000 }
      );
      for (const c of catRes.data || []) {
        if (c.name) categories.push(c.name);
      }
    }

    if (tagIds.length > 0) {
      const tagRes = await axios.get(
        `${baseUrl}/wp-json/wp/v2/tags?include=${tagIds.join(",")}&_fields=name`,
        { timeout: 8000 }
      );
      for (const t of tagRes.data || []) {
        if (t.name) tags.push(t.name);
      }
    }

    return { categories, tags };
  } catch {
    return { categories: [], tags: [] };
  }
}

function extractSlugFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

export async function crawlWordPressPost(url: string): Promise<CrawledPost> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const $ = cheerio.load(response.data);

  const title = $("h1.entry-title, h1.post-title, .entry-header h1, article h1, h1").first().text().trim()
    || $("meta[property='og:title']").attr("content")?.trim()
    || $("title").text().split("|")[0].split("-")[0].trim()
    || "Untitled";

  const slug = extractSlugFromUrl(url) || slugify(title);

  let contentEl = $(".elementor-widget-theme-post-content .elementor-widget-container").first();

  if (contentEl.length === 0) {
    contentEl = $(".entry-content, .post-content, article .content, .single-content, .post-body").first();
  }

  if (contentEl.length === 0) {
    contentEl = $(".elementor-text-editor").first();
  }

  contentEl.find("script, style, .sharedaddy, .jp-relatedposts, .post-navigation, .comments-area, .wpd-comment-form, .elementor-widget-table-of-contents").remove();

  let contentHtml = contentEl.html() || "";

  const comoCitarMatch = contentHtml.match(/<h2[^>]*>[\s]*Como citar[\s]*<\/h2>/i);
  if (comoCitarMatch && comoCitarMatch.index !== undefined) {
    const afterHeading = contentHtml.substring(comoCitarMatch.index + comoCitarMatch[0].length);
    const nextBlockEnd = afterHeading.indexOf("</p>");
    if (nextBlockEnd > -1) {
      const citarSection = comoCitarMatch[0] + afterHeading.substring(0, nextBlockEnd + 4);
      contentHtml = contentHtml.substring(0, comoCitarMatch.index) + citarSection;
    }
  }

  const textContent = contentEl.text().trim();
  const excerpt = textContent.substring(0, 300).replace(/\s+/g, " ").trim() + (textContent.length > 300 ? "..." : "");

  const featuredImage = $("meta[property='og:image']").attr("content")
    || $(".post-thumbnail img, .wp-post-image, article img").first().attr("src")
    || null;

  let authorName = $(".author-name, .entry-author, .post-author a").first().text().trim()
    || $("meta[name='author']").attr("content")?.trim()
    || null;

  if (!authorName) {
    $(".elementor-icon-list-text, .elementor-post-info__item--type-author").each((_, el) => {
      const text = $(el).text().trim();
      if (text && !text.match(/^\d/) && text.length < 50 && !text.includes("@")) {
        authorName = text;
        return false;
      }
    });
  }

  const publishedMeta = $("meta[property='article:published_time']").attr("content")
    || $("time[datetime]").first().attr("datetime")
    || null;

  const baseUrl = extractBaseUrl(url);
  const wpSlug = extractSlugFromUrl(url);
  const wpData = await fetchWpApiCategoriesAndTags(baseUrl, wpSlug);

  let finalCategories = wpData.categories;
  let finalTags = wpData.tags;

  if (finalCategories.length === 0) {
    const categoriesSet = new Set<string>();
    $("a[rel='category tag'], .cat-links a, .entry-categories a, .post-categories a, a[rel='category']").each((_, el) => {
      const name = $(el).text().trim();
      if (name && name.length < 100) categoriesSet.add(name);
    });
    finalCategories = Array.from(categoriesSet);
  }

  if (finalTags.length === 0) {
    const tagsSet = new Set<string>();
    $("a[rel='tag'], .tag-links a, .entry-tags a, .post-tags a, .tags-links a").each((_, el) => {
      const name = $(el).text().trim();
      if (name && name.length < 100) tagsSet.add(name);
    });
    finalTags = Array.from(tagsSet);
  }

  return {
    title,
    slug,
    content: contentHtml,
    excerpt,
    featuredImage,
    authorName: authorName || null,
    publishedAt: publishedMeta,
    categories: finalCategories,
    tags: finalTags,
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
