import type { Express } from "express";
import TurndownService from "turndown";
import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || "https://www.blog.psicometriaonline.com.br";
const SITE_NAME = "Blog Psicometria Online";
const CACHE_HEADER = "public, max-age=3600";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});
turndown.remove(["script", "style", "noscript", "iframe"]);
turndown.addRule("citationBox", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).className === "citation-box",
  replacement: (content) => `\n\n> **Como citar este artigo:** ${content.trim()}\n\n`,
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function yamlEscape(s: string): string {
  return String(s).replace(/"/g, '\\"');
}

function buildPostMarkdown(post: Awaited<ReturnType<typeof storage.getPostBySlug>>): string | null {
  if (!post) return null;
  const url = `${SITE_URL}/${post.slug}`;
  const author = post.authorName || post.author?.name || SITE_NAME;
  const desc = post.metaDescription || post.excerpt || truncate(stripHtml(post.content), 160);

  // YAML frontmatter (LLM/RAG consumers expect this).
  const fm: string[] = ["---"];
  fm.push(`title: "${yamlEscape(post.title)}"`);
  fm.push(`url: ${url}`);
  fm.push(`canonical: ${url}`);
  fm.push(`language: pt-BR`);
  if (post.publishedAt) fm.push(`published: ${new Date(post.publishedAt).toISOString()}`);
  if (post.updatedAt) fm.push(`modified: ${new Date(post.updatedAt).toISOString()}`);
  fm.push(`author: "${yamlEscape(author)}"`);
  if (post.categories.length) fm.push(`categories: [${post.categories.map((c) => `"${yamlEscape(c.name)}"`).join(", ")}]`);
  if (post.tags.length) fm.push(`tags: [${post.tags.map((t) => `"${yamlEscape(t.name)}"`).join(", ")}]`);
  if (desc) fm.push(`description: "${yamlEscape(desc)}"`);
  fm.push(`source: ${SITE_NAME}`);
  fm.push("---");
  fm.push("");

  const body: string[] = [];
  body.push(`# ${post.title}`);
  body.push("");
  if (post.excerpt) {
    body.push(`> ${post.excerpt}`);
    body.push("");
  }
  body.push(htmlToMarkdown(post.content));

  if (post.faq) {
    try {
      const faqItems = JSON.parse(post.faq) as Array<{ q: string; a: string }>;
      const valid = faqItems.filter((i) => i.q && i.a);
      if (valid.length > 0) {
        body.push("");
        body.push("## Perguntas frequentes");
        body.push("");
        for (const it of valid) {
          body.push(`### ${it.q}`);
          body.push("");
          body.push(it.a);
          body.push("");
        }
      }
    } catch {
      // ignore malformed FAQ
    }
  }
  body.push("");
  return fm.join("\n") + body.join("\n");
}

export function htmlToMarkdown(html: string): string {
  try {
    return turndown.turndown(html || "");
  } catch {
    return stripHtml(html || "");
  }
}

export function registerLlmsRoutes(app: Express) {
  app.get("/llms.txt", async (_req, res) => {
    try {
      const about = (await storage.getSetting("llms_about_text"))?.trim();
      const allPublished = await storage.getPosts({ status: "published", limit: 10000 });
      // Top-50 mais lidos (fallback para mais recentes se views=0)
      const topRead = [...allPublished]
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, 50);
      const recent = [...allPublished]
        .sort((a, b) => {
          const da = new Date(a.publishedAt || 0).getTime();
          const db = new Date(b.publishedAt || 0).getTime();
          return db - da;
        })
        .slice(0, 50);
      const categories = await storage.getCategories();
      const tags = await storage.getTags();

      const lines: string[] = [];
      lines.push(`# ${SITE_NAME}`);
      lines.push("");
      lines.push(`> ${about || "Blog acadêmico sobre psicometria, estatística e pesquisa quantitativa em psicologia."}`);
      lines.push("");
      lines.push("## Sobre");
      lines.push("");
      lines.push(`- Site: ${SITE_URL}`);
      lines.push(`- Idioma: Português (Brasil)`);
      lines.push(`- Tema: Psicometria, estatística aplicada, validação de instrumentos psicológicos.`);
      lines.push(`- Sitemap: ${SITE_URL}/sitemap.xml`);
      lines.push(`- Conteúdo completo: ${SITE_URL}/llms-full.txt`);
      lines.push("");

      lines.push("## Top 50 mais lidos");
      lines.push("");
      for (const p of topRead) {
        const desc = p.metaDescription || p.excerpt || truncate(stripHtml(p.content), 140);
        lines.push(`- [${p.title}](${SITE_URL}/${p.slug}): ${desc}`);
      }
      lines.push("");

      lines.push("## Posts recentes");
      lines.push("");
      for (const p of recent) {
        const desc = p.metaDescription || p.excerpt || truncate(stripHtml(p.content), 140);
        lines.push(`- [${p.title}](${SITE_URL}/${p.slug}): ${desc}`);
      }
      lines.push("");

      lines.push("## Markdown Mirrors");
      lines.push("");
      lines.push("Cada post está disponível em Markdown puro adicionando `.md` à URL:");
      lines.push("");
      for (const p of recent) {
        lines.push(`- ${SITE_URL}/${p.slug}.md`);
      }
      lines.push("");

      lines.push("## Categorias");
      lines.push("");
      for (const c of categories) {
        lines.push(`- [${c.name}](${SITE_URL}/categorias/${c.slug})${c.description ? `: ${c.description}` : ""}`);
      }
      lines.push("");

      lines.push("## Tags");
      lines.push("");
      for (const t of tags) {
        lines.push(`- [${t.name}](${SITE_URL}/tags/${t.slug})`);
      }
      lines.push("");

      const faqJson = (await storage.getSetting("llms_faq_json"))?.trim();
      if (faqJson) {
        try {
          const items = JSON.parse(faqJson) as Array<{ q: string; a: string }>;
          if (Array.isArray(items) && items.length > 0) {
            lines.push("## FAQ");
            lines.push("");
            for (const it of items) {
              if (!it.q || !it.a) continue;
              lines.push(`### ${it.q}`);
              lines.push("");
              lines.push(it.a);
              lines.push("");
            }
          }
        } catch {
          // ignore
        }
      }

      res
        .header("Content-Type", "text/plain; charset=utf-8")
        .header("Cache-Control", CACHE_HEADER)
        .header("X-Robots-Tag", "index, follow")
        .send(lines.join("\n"));
    } catch (err: any) {
      res.status(500).type("text/plain").send(`# Erro ao gerar llms.txt\n${err.message}`);
    }
  });

  app.get("/llms-full.txt", async (_req, res) => {
    try {
      const about = (await storage.getSetting("llms_about_text"))?.trim();
      const posts = await storage.getPosts({ status: "published", limit: 10000 });
      const lines: string[] = [];
      lines.push(`# ${SITE_NAME} — Conteúdo completo`);
      lines.push("");
      lines.push(`> ${about || "Blog acadêmico sobre psicometria, estatística e pesquisa quantitativa em psicologia."}`);
      lines.push("");
      for (const p of posts) {
        lines.push(`## ${p.title}`);
        lines.push("");
        lines.push(`URL: ${SITE_URL}/${p.slug}`);
        lines.push(`Markdown: ${SITE_URL}/${p.slug}.md`);
        if (p.publishedAt) lines.push(`Publicado em: ${new Date(p.publishedAt).toISOString().split("T")[0]}`);
        if (p.authorName || p.author?.name) lines.push(`Autor: ${p.authorName || p.author?.name}`);
        if (p.categories.length) lines.push(`Categorias: ${p.categories.map((c) => c.name).join(", ")}`);
        if (p.tags.length) lines.push(`Tags: ${p.tags.map((t) => t.name).join(", ")}`);
        lines.push("");
        if (p.excerpt) {
          lines.push(`**Resumo:** ${p.excerpt}`);
          lines.push("");
        }
        lines.push(htmlToMarkdown(p.content));
        lines.push("");
        lines.push("---");
        lines.push("");
      }
      res
        .header("Content-Type", "text/plain; charset=utf-8")
        .header("Cache-Control", CACHE_HEADER)
        .header("X-Robots-Tag", "index, follow")
        .send(lines.join("\n"));
    } catch (err: any) {
      res.status(500).type("text/plain").send(`# Erro ao gerar llms-full.txt\n${err.message}`);
    }
  });

  // Markdown mirror for posts: /<slug>.md (with YAML frontmatter)
  app.get(/^\/([a-z0-9][a-z0-9\-]*)\.md$/i, async (req, res, next) => {
    try {
      const slug = req.params[0];
      if (!slug) return next();
      const post = await storage.getPostBySlug(slug);
      if (!post || post.status !== "published") {
        return res.status(404)
          .header("Content-Type", "text/plain; charset=utf-8")
          .send(`# 404\nPost not found: ${slug}\n`);
      }
      const md = buildPostMarkdown(post);
      if (!md) return next();
      res
        .header("Content-Type", "text/markdown; charset=utf-8")
        .header("Cache-Control", CACHE_HEADER)
        .header("X-Robots-Tag", "index, follow")
        .header("Link", `<${SITE_URL}/${post.slug}>; rel="canonical"`)
        .send(md);
    } catch (err) {
      next(err);
    }
  });
}
