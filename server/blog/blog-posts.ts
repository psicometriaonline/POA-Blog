// ============================================================
// Persistencia de um post gerado (Fase 1) como RASCUNHO no CMS.
//
// Traduz o GeneratedPost (secoes + referencias + CTA) para o modelo do CMS:
// content HTML unico + coluna faq (JSON, alimenta o FAQPage JSON-LD) +
// target_query + categoria do eixo. Sempre em rascunho (publish:false) nesta
// fase; um humano revisa e publica com um clique.
// ============================================================

import { storage } from "../storage";
import type { InsertPost, Post } from "@shared/schema";
import type { Eixo } from "@shared/blog/seeds";
import {
  type GeneratedPost,
  sectionsToHtml,
  extrairFaq,
  slugify,
} from "./blog-generator";

const DISCLAIMER =
  "Este conteudo e educativo; verifique os pressupostos e adapte ao seu desenho de pesquisa e aos seus dados.";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function ensureUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "post";
  let slug = base;
  let n = 2;
  while (await storage.getPostBySlug(slug)) {
    slug = `${base}-${n++}`;
    if (n > 100) {
      slug = `${base}-${Date.now()}`;
      break;
    }
  }
  return slug;
}

async function garantirTag(nome: string): Promise<number | null> {
  const slug = slugify(nome);
  if (!slug) return null;
  const existente = await storage.getTagBySlug(slug);
  if (existente) return existente.id;
  const criada = await storage.createTag({ name: nome, slug });
  return criada.id;
}

// Monta o HTML final: corpo + Referencias (canonicas, ja resolvidas por DOI) +
// CTA + disclaimer educativo.
function montarHtml(generated: GeneratedPost): string {
  const partes = [sectionsToHtml(generated.body)];

  if (generated.referencias.length > 0) {
    partes.push("<h2>Referencias</h2>");
    partes.push(
      "<ol>" + generated.referencias.map((r) => `<li>${escapeHtml(r)}</li>`).join("") + "</ol>",
    );
  }
  if (generated.ctaCurso) {
    partes.push(
      `<p><strong>Continue aprendendo:</strong> para dominar este tema na pratica, ` +
        `conheca a formacao <em>${escapeHtml(generated.ctaCurso)}</em> da Psicometria Online Academy.</p>`,
    );
  }
  partes.push(`<p><em>${escapeHtml(DISCLAIMER)}</em></p>`);
  return partes.join("\n");
}

export interface PersistOpts {
  publish: boolean;
  targetQuery: string | null;
}

// Persiste o post. Devolve o Post criado. Escreve na tabela posts de producao
// (rodar no Replit). Nesta fase, sempre publish:false (rascunho).
export async function persistGeneratedPost(
  generated: GeneratedPost,
  eixo: Eixo,
  opts: PersistOpts,
): Promise<Post> {
  const categoria = await storage.getCategoryBySlug(eixo.categorySlug);
  if (!categoria) {
    throw new Error(
      `Categoria "${eixo.categorySlug}" nao existe no CMS. Crie-a antes de gerar posts deste eixo.`,
    );
  }

  const slug = await ensureUniqueSlug(generated.title);
  const faq = extrairFaq(generated.body);

  // Tag do cluster (o CMS exige ao menos uma tag por post).
  const tagId = await garantirTag(generated.subcategoria || generated.keywords[0] || eixo.macro);
  const tagIds = tagId ? [tagId] : [];

  const data: InsertPost = {
    title: generated.title,
    slug,
    content: montarHtml(generated),
    excerpt: generated.excerpt || null,
    status: opts.publish ? "published" : "draft",
    seoTitle: generated.title.slice(0, 60) || null,
    metaDescription: (generated.excerpt || generated.subtitle || "").slice(0, 160) || null,
    focusKeyword: generated.keywords[0] || null,
    faq: faq.length > 0 ? JSON.stringify(faq) : null,
    targetQuery: opts.targetQuery,
    publishedAt: opts.publish ? new Date() : null,
  };

  const post = await storage.createPost(data, [categoria.id], tagIds);
  return post;
}
