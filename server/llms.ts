import type { Express } from "express";
import TurndownService from "turndown";
import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || "https://www.blog.psicometriaonline.com.br";
const SITE_NAME = "Blog Psicometria Online";

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
      const posts = await storage.getPosts({ status: "published", limit: 200 });
      const categories = await storage.getCategories();
      const tags = await storage.getTags();

      const lines: string[] = [];
      lines.push(`# ${SITE_NAME}`);
      lines.push("");
      lines.push(`> ${about || "Blog acadêmico sobre psicometria, estatística e pesquisa quantitativa em psicologia."}`);
      lines.push("");
      lines.push("## Sobre");
      lines.push("");
      lines.push(`Site: ${SITE_URL}`);
      lines.push(`Idioma: Português (Brasil)`);
      lines.push(`Tema: Psicometria, estatística aplicada, validação de instrumentos psicológicos.`);
      lines.push("");
      lines.push("## Posts (mais recentes)");
      lines.push("");
      for (const p of posts) {
        const desc = p.metaDescription || p.excerpt || truncate(stripHtml(p.content), 140);
        lines.push(`- [${p.title}](${SITE_URL}/${p.slug}.md): ${desc}`);
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
        .header("X-Robots-Tag", "index, follow")
        .send(lines.join("\n"));
    } catch (err: any) {
      res.status(500).type("text/plain").send(`# Erro ao gerar llms.txt\n${err.message}`);
    }
  });

  app.get("/llms-full.txt", async (_req, res) => {
    try {
      const about = (await storage.getSetting("llms_about_text"))?.trim();
      const posts = await storage.getPosts({ status: "published", limit: 1000 });
      const lines: string[] = [];
      lines.push(`# ${SITE_NAME} — Conteúdo completo`);
      lines.push("");
      lines.push(`> ${about || "Blog acadêmico sobre psicometria, estatística e pesquisa quantitativa em psicologia."}`);
      lines.push("");
      for (const p of posts) {
        lines.push(`## ${p.title}`);
        lines.push("");
        lines.push(`URL: ${SITE_URL}/${p.slug}`);
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
        .header("X-Robots-Tag", "index, follow")
        .send(lines.join("\n"));
    } catch (err: any) {
      res.status(500).type("text/plain").send(`# Erro ao gerar llms-full.txt\n${err.message}`);
    }
  });

  // Markdown mirror for posts: /<slug>.md
  app.get(/^\/([a-z0-9][a-z0-9\-]*)\.md$/i, async (req, res, next) => {
    try {
      const slug = req.params[0];
      if (!slug) return next();
      const post = await storage.getPostBySlug(slug);
      if (!post || post.status !== "published") return next();
      const lines: string[] = [];
      lines.push(`# ${post.title}`);
      lines.push("");
      lines.push(`URL: ${SITE_URL}/${post.slug}`);
      if (post.publishedAt) lines.push(`Publicado em: ${new Date(post.publishedAt).toISOString().split("T")[0]}`);
      if (post.updatedAt) lines.push(`Atualizado em: ${new Date(post.updatedAt).toISOString().split("T")[0]}`);
      if (post.authorName || post.author?.name) lines.push(`Autor: ${post.authorName || post.author?.name}`);
      if (post.categories.length) lines.push(`Categorias: ${post.categories.map((c) => c.name).join(", ")}`);
      if (post.tags.length) lines.push(`Tags: ${post.tags.map((t) => t.name).join(", ")}`);
      lines.push("");
      if (post.excerpt) {
        lines.push(`> ${post.excerpt}`);
        lines.push("");
      }
      lines.push(htmlToMarkdown(post.content));
      lines.push("");
      res
        .header("Content-Type", "text/plain; charset=utf-8")
        .header("X-Robots-Tag", "index, follow")
        .header("Link", `<${SITE_URL}/${post.slug}>; rel="canonical"`)
        .send(lines.join("\n"));
    } catch (err) {
      next(err);
    }
  });
}
