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
import { type GeneratedPost, sectionsToHtml, slugify } from "./blog-generator";
import { buscarImagemPexels } from "./pexels";

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Resolve o autor dos rascunhos: Bruno Damasio (configuravel por BLOG_AUTHOR_NAME).
// Procura o registro em authors pelo nome; se existir, usa id + nome canonicos.
async function resolverAutor(): Promise<{ authorId: number | null; authorName: string }> {
  const nome = (process.env.BLOG_AUTHOR_NAME || "Bruno Damásio").trim();
  const alvo = semAcento(nome);
  const autores = await storage.getAuthors();
  const match =
    autores.find((a) => semAcento(a.name) === alvo) ||
    autores.find((a) => semAcento(a.name).includes("damasio"));
  return { authorId: match?.id ?? null, authorName: match?.name ?? nome };
}

// Query tematica para a imagem de destaque (Pexels). Metodos especificos nao tem
// foto de banco; usamos um tema academico por eixo. Override: BLOG_PEXELS_QUERY.
function queryPexels(eixo: Eixo): string {
  const override = process.env.BLOG_PEXELS_QUERY?.trim();
  if (override) return override;
  const porEixo: Record<string, string> = {
    psicometria: "psychology research questionnaire survey",
    "analise-fatorial": "data analysis statistics chart research",
  };
  return porEixo[eixo.categorySlug] || "statistics data analysis academic research";
}

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
  const linkSlugs = (generated.internalLinks ?? []).map((l) => l.slug);
  const partes = [sectionsToHtml(generated.body, linkSlugs)];

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
  let categoria = await storage.getCategoryBySlug(eixo.categorySlug);
  if (!categoria) {
    // Auto-cria a categoria do eixo (ambientes novos, ex.: producao, nao tem os
    // dados de dev). Nome derivado do slug; descricao = intro da pillar page.
    const nome = eixo.categorySlug
      .split("-")
      .map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
      .join(" ");
    try {
      categoria = await storage.createCategory({
        name: nome,
        slug: eixo.categorySlug,
        description: eixo.pillarIntro,
      });
      console.log(`[blog-posts] Categoria "${nome}" (${eixo.categorySlug}) criada automaticamente.`);
    } catch (err) {
      // Corrida: outra execucao criou a categoria entre o check e o create.
      categoria = await storage.getCategoryBySlug(eixo.categorySlug);
      if (!categoria) throw err;
    }
  }

  const slug = await ensureUniqueSlug(generated.title);

  // Tag do cluster (o CMS exige ao menos uma tag por post).
  const tagId = await garantirTag(generated.subcategoria || generated.keywords[0] || eixo.macro);
  const tagIds = tagId ? [tagId] : [];

  // Autor (Bruno Damasio) e imagem de destaque (Pexels, fail-open).
  const { authorId, authorName } = await resolverAutor();
  const imagem = await buscarImagemPexels(queryPexels(eixo));

  const data: InsertPost = {
    title: generated.title,
    slug,
    content: montarHtml(generated),
    excerpt: generated.excerpt || null,
    status: opts.publish ? "published" : "draft",
    authorId,
    authorName,
    featuredImage: imagem?.url ?? null,
    seoTitle: generated.title.slice(0, 60) || null,
    metaDescription: (generated.excerpt || generated.subtitle || "").slice(0, 160) || null,
    focusKeyword: generated.keywords[0] || null,
    // A FAQ vai INLINE como H2 "Perguntas frequentes" no content (decisao
    // editorial: parte do texto, nao um Card a parte). Por isso NAO populamos a
    // coluna faq — no CMS ela renderiza um Card separado (post.tsx) e no formato
    // {q,a}. O FAQPage JSON-LD sera restaurado na Fase 2 (SEO), emitido a partir
    // da FAQ do proprio content, sem Card.
    faq: null,
    targetQuery: opts.targetQuery,
    publishedAt: opts.publish ? new Date() : null,
  };

  const post = await storage.createPost(data, [categoria.id], tagIds);
  return post;
}
