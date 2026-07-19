import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || "https://www.blog.psicometriaonline.com.br";
const SITE_NAME = "Blog Psicometria Online";
const DEFAULT_DESC = "Blog especializado em psicometria, estatística e pesquisa quantitativa em psicologia.";
const PLACEHOLDER = "<!--SEO_HEAD-->";

export type SeoInjectResult = { html: string; status: number };

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function meta(name: string, content: string, isProperty = false): string {
  if (!content) return "";
  const attr = isProperty ? "property" : "name";
  return `    <meta ${attr}="${escapeAttr(name)}" content="${escapeAttr(content)}">\n`;
}

function ldScript(obj: any): string {
  return `    <script type="application/ld+json">${escapeJsonLd(JSON.stringify(obj))}</script>\n`;
}

function hreflang(url: string): string {
  return `    <link rel="alternate" hreflang="pt-BR" href="${escapeAttr(url)}">\n    <link rel="alternate" hreflang="x-default" href="${escapeAttr(url)}">\n`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

async function buildHomeHead(siteVerifs: { google?: string; bing?: string }, ogImage: string): Promise<string> {
  const title = `${SITE_NAME} — Psicometria, estatística e pesquisa em psicologia`;
  const desc = DEFAULT_DESC;
  const url = `${SITE_URL}/`;
  let html = "";
  html += `    <title>${escapeAttr(title)}</title>\n`;
  html += meta("description", desc);
  html += `    <link rel="canonical" href="${escapeAttr(url)}">\n`;
  html += hreflang(url);
  html += meta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  html += meta("og:type", "website", true);
  html += meta("og:site_name", SITE_NAME, true);
  html += meta("og:title", title, true);
  html += meta("og:description", desc, true);
  html += meta("og:url", url, true);
  html += meta("og:locale", "pt_BR", true);
  if (ogImage) html += meta("og:image", ogImage, true);
  html += meta("twitter:card", "summary_large_image");
  html += meta("twitter:title", title);
  html += meta("twitter:description", desc);
  if (ogImage) html += meta("twitter:image", ogImage);
  if (siteVerifs.google) html += meta("google-site-verification", siteVerifs.google);
  if (siteVerifs.bing) html += meta("msvalidate.01", siteVerifs.bing);

  html += ldScript({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://www.psicometriaonline.com.br",
      "https://academy-po.psicometriaonline.com.br",
    ],
  });
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "pt-BR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
  });
  return html;
}

// Deriva itens de FAQ {q,a} de uma secao "Perguntas frequentes" INLINE no corpo
// (posts gerados poem a FAQ como H2 no content, nao na coluna faq). Usado como
// fallback para o FAQPage JSON-LD quando post.faq esta vazio. Retrocompativel:
// so entra quando nao ha faq estruturada. Beneficia tambem posts manuais que
// escrevem a FAQ dentro do texto.
function faqFromContentHtml(html: string): Array<{ q: string; a: string }> {
  if (!html) return [];
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const heads: Array<{ end: number; idx: number; text: string }> = [];
  const h2re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = h2re.exec(html))) heads.push({ idx: m.index, end: m.index + m[0].length, text: norm(stripHtml(m[1])) });
  let start = -1;
  let end = html.length;
  for (let i = 0; i < heads.length; i++) {
    if (heads[i].text.includes("perguntas frequentes")) {
      start = heads[i].end;
      end = i + 1 < heads.length ? heads[i + 1].idx : html.length;
      break;
    }
  }
  if (start === -1) return [];
  const paras = Array.from(html.slice(start, end).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((x) => stripHtml(x[1]).trim())
    .filter(Boolean);
  const out: Array<{ q: string; a: string }> = [];
  for (let i = 0; i < paras.length; i++) {
    if (paras[i].endsWith("?") && paras[i + 1] && !paras[i + 1].endsWith("?")) {
      out.push({ q: paras[i], a: paras[i + 1] });
      i++;
    }
  }
  return out;
}

async function buildPostHead(slug: string, siteVerifs: { google?: string; bing?: string }, defaultOg: string): Promise<string | null> {
  const post = await storage.getPostBySlug(slug);
  if (!post || post.status !== "published") return null;
  const title = post.seoTitle || post.title;
  const fullTitle = `${title} | ${SITE_NAME}`;
  const desc = post.metaDescription || post.excerpt || truncate(stripHtml(post.content), 160);
  const url = `${SITE_URL}/${post.slug}`;
  const image = post.featuredImage || defaultOg;
  const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
  const modified = post.updatedAt ? new Date(post.updatedAt).toISOString() : published;
  const author = post.authorName || post.author?.name || SITE_NAME;
  const primaryCategory = post.categories[0];

  let html = "";
  html += `    <title>${escapeAttr(fullTitle)}</title>\n`;
  html += meta("description", desc);
  html += `    <link rel="canonical" href="${escapeAttr(url)}">\n`;
  html += hreflang(url);
  html += `    <link rel="alternate" type="text/markdown" href="${escapeAttr(url)}.md" title="Versão Markdown">\n`;
  html += meta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  html += meta("article:published_time", published || "", true);
  html += meta("article:modified_time", modified || "", true);
  if (primaryCategory) html += meta("article:section", primaryCategory.name, true);
  for (const t of post.tags) html += meta("article:tag", t.name, true);
  if (author) html += meta("article:author", author, true);
  html += meta("og:type", "article", true);
  html += meta("og:site_name", SITE_NAME, true);
  html += meta("og:title", title, true);
  html += meta("og:description", desc, true);
  html += meta("og:url", url, true);
  html += meta("og:locale", "pt_BR", true);
  if (image) html += meta("og:image", image, true);
  html += meta("twitter:card", "summary_large_image");
  html += meta("twitter:title", title);
  html += meta("twitter:description", desc);
  if (image) html += meta("twitter:image", image);
  if (siteVerifs.google) html += meta("google-site-verification", siteVerifs.google);
  if (siteVerifs.bing) html += meta("msvalidate.01", siteVerifs.bing);

  const blogPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: title,
    name: title,
    description: desc,
    inLanguage: "pt-BR",
    url,
    datePublished: published,
    dateModified: modified,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    keywords: post.tags.map((t) => t.name).join(", ") || undefined,
    articleSection: primaryCategory?.name,
  };
  if (image) blogPosting.image = [image];
  html += ldScript(blogPosting);

  const breadcrumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL + "/" },
  ];
  if (primaryCategory) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: primaryCategory.name,
      item: `${SITE_URL}/categoria/${primaryCategory.slug}`,
    });
    breadcrumbItems.push({ "@type": "ListItem", position: 3, name: title, item: url });
  } else {
    breadcrumbItems.push({ "@type": "ListItem", position: 2, name: title, item: url });
  }
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  });

  // FAQPage JSON-LD: prioriza a coluna faq (estruturada); se vazia, deriva da
  // FAQ inline no corpo (posts gerados). Retrocompativel.
  let faqItems: Array<{ q: string; a: string }> = [];
  if (post.faq) {
    try {
      const parsed = JSON.parse(post.faq) as Array<{ q: string; a: string }>;
      if (Array.isArray(parsed)) faqItems = parsed.filter((i) => i.q && i.a);
    } catch {
      // ignore malformed faq json
    }
  }
  if (faqItems.length === 0) faqItems = faqFromContentHtml(post.content);
  if (faqItems.length > 0) {
    html += ldScript({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
    });
  }
  return html;
}

async function buildCategoryHead(slug: string, defaultOg: string): Promise<string | null> {
  const cat = await storage.getCategoryBySlug(slug);
  if (!cat) return null;
  const title = `${cat.name} — ${SITE_NAME}`;
  const desc = cat.description || `Artigos sobre ${cat.name} no ${SITE_NAME}.`;
  const url = `${SITE_URL}/categoria/${cat.slug}`;
  let html = "";
  html += `    <title>${escapeAttr(title)}</title>\n`;
  html += meta("description", desc);
  html += `    <link rel="canonical" href="${escapeAttr(url)}">\n`;
  html += hreflang(url);
  html += meta("robots", "index,follow,max-image-preview:large,max-snippet:-1");
  html += meta("og:type", "website", true);
  html += meta("og:site_name", SITE_NAME, true);
  html += meta("og:title", cat.name, true);
  html += meta("og:description", desc, true);
  html += meta("og:url", url, true);
  html += meta("og:locale", "pt_BR", true);
  if (defaultOg) html += meta("og:image", defaultOg, true);
  html += meta("twitter:card", "summary_large_image");
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    description: desc,
    url,
    inLanguage: "pt-BR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  });
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Categorias", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 3, name: cat.name, item: url },
    ],
  });
  return html;
}

async function buildTagHead(slug: string, defaultOg: string): Promise<string | null> {
  const tag = await storage.getTagBySlug(slug);
  if (!tag) return null;
  const title = `${tag.name} — ${SITE_NAME}`;
  const desc = `Artigos com a tag ${tag.name} no ${SITE_NAME}.`;
  const url = `${SITE_URL}/tag/${tag.slug}`;
  let html = "";
  html += `    <title>${escapeAttr(title)}</title>\n`;
  html += meta("description", desc);
  html += `    <link rel="canonical" href="${escapeAttr(url)}">\n`;
  html += hreflang(url);
  html += meta("robots", "index,follow,max-image-preview:large,max-snippet:-1");
  html += meta("og:type", "website", true);
  html += meta("og:site_name", SITE_NAME, true);
  html += meta("og:title", tag.name, true);
  html += meta("og:description", desc, true);
  html += meta("og:url", url, true);
  html += meta("og:locale", "pt_BR", true);
  if (defaultOg) html += meta("og:image", defaultOg, true);
  html += meta("twitter:card", "summary_large_image");
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: tag.name,
    description: desc,
    url,
    inLanguage: "pt-BR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  });
  html += ldScript({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Tags", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 3, name: tag.name, item: url },
    ],
  });
  return html;
}

function notFoundHead(path: string): string {
  const url = `${SITE_URL}${path}`;
  let html = "";
  html += `    <title>Página não encontrada — ${SITE_NAME}</title>\n`;
  html += meta("description", "A página solicitada não foi encontrada.");
  html += meta("robots", "noindex,follow");
  html += `    <link rel="canonical" href="${escapeAttr(url)}">\n`;
  return html;
}

const STATIC_PAGES: Record<string, { title: string; desc: string }> = {
  "/busca": { title: "Busca", desc: `Pesquise artigos no ${SITE_NAME}.` },
  "/termos-de-uso": { title: "Termos de uso", desc: `Termos de uso do ${SITE_NAME}.` },
  "/politicas-de-privacidade": { title: "Políticas de privacidade", desc: `Política de privacidade do ${SITE_NAME}.` },
  "/quem-somos": { title: "Quem somos", desc: `Conheça a equipe do ${SITE_NAME}.` },
};

function buildStaticPageHead(path: string, ogImage: string): string {
  const meta_ = STATIC_PAGES[path];
  if (!meta_) return "";
  const fullTitle = `${meta_.title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const robots = path === "/busca" ? "noindex,follow" : "index,follow";
  let html = "";
  html += `    <title>${escapeAttr(fullTitle)}</title>\n`;
  html += meta("description", meta_.desc);
  html += `    <link rel="canonical" href="${escapeAttr(url)}">\n`;
  html += hreflang(url);
  html += meta("robots", robots);
  html += meta("og:type", "website", true);
  html += meta("og:site_name", SITE_NAME, true);
  html += meta("og:title", meta_.title, true);
  html += meta("og:description", meta_.desc, true);
  html += meta("og:url", url, true);
  html += meta("og:locale", "pt_BR", true);
  if (ogImage) html += meta("og:image", ogImage, true);
  html += meta("twitter:card", "summary_large_image");
  return html;
}

/**
 * Inject SEO head and return both the rewritten HTML and the appropriate
 * HTTP status. Unknown post slugs / categories / tags get a real 404 with a
 * noindex SEO head so search engines do not index ghost URLs.
 */
export async function injectSeoHead(html: string, urlPath: string): Promise<SeoInjectResult> {
  if (!html.includes(PLACEHOLDER)) return { html, status: 200 };
  const path = urlPath.split("?")[0];
  if (path === "/admin" || path.startsWith("/admin/")) {
    return {
      html: html.replace(PLACEHOLDER, `    <meta name="robots" content="noindex,nofollow">\n`),
      status: 200,
    };
  }
  if (path.startsWith("/api/")) {
    return { html: html.replace(PLACEHOLDER, ""), status: 200 };
  }

  try {
    const [google, bing, defaultOg] = await Promise.all([
      storage.getSetting("google_site_verification"),
      storage.getSetting("bing_site_verification"),
      storage.getSetting("default_og_image"),
    ]);
    const verifs = { google: google?.trim(), bing: bing?.trim() };
    const ogImage = (defaultOg?.trim()) || `${SITE_URL}/logo.png`;

    let head: string | null = null;
    let isContentRoute = false;
    const trimmed = path.replace(/\/$/, "") || "/";
    if (path === "/" || path === "") {
      head = await buildHomeHead(verifs, ogImage);
    } else if (STATIC_PAGES[trimmed]) {
      head = buildStaticPageHead(trimmed, ogImage);
    } else if (path.startsWith("/categoria/")) {
      isContentRoute = true;
      const slug = path.replace(/^\/categoria\//, "").replace(/\/$/, "");
      if (slug && !slug.includes("/")) head = await buildCategoryHead(slug, ogImage);
    } else if (path.startsWith("/tag/")) {
      isContentRoute = true;
      const slug = path.replace(/^\/tag\//, "").replace(/\/$/, "");
      if (slug && !slug.includes("/")) head = await buildTagHead(slug, ogImage);
    } else if (!path.startsWith("/uploads/") && !path.includes(".")) {
      isContentRoute = true;
      const slug = path.replace(/^\//, "").replace(/\/$/, "");
      if (slug && !slug.includes("/")) {
        head = await buildPostHead(slug, verifs, ogImage);
      }
    }

    if (head === null) {
      // For content routes that didn't resolve, return a true 404.
      if (isContentRoute) {
        return { html: html.replace(PLACEHOLDER, notFoundHead(path)), status: 404 };
      }
      return { html: html.replace(PLACEHOLDER, ""), status: 200 };
    }
    return { html: html.replace(PLACEHOLDER, head), status: 200 };
  } catch (err) {
    console.error("[seo-html] inject error:", err);
    return { html: html.replace(PLACEHOLDER, ""), status: 200 };
  }
}
