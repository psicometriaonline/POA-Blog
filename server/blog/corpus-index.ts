// ============================================================
// Anti-canibalizacao contra o corpus de 500+ posts manuais (Secao 5.8 do mapa).
//
// O maior risco do gerador automatico neste site consolidado nao e qualidade, e
// CANIBALIZACAO: publicar algo proximo demais de um post existente, fazendo os
// dois competirem pela mesma busca. Dedup por titulo exato NAO basta.
//
// Mecanismo em camadas, rodado em dois checkpoints (ao enfileirar e antes de
// publicar):
//   Passo 0 — ingerir/indexar o corpus (titulo normalizado + embedding).
//   Camada 1 — lexical (pg_trgm): barata, deterministica.
//   Camada 2 — semantica (pgvector, cosseno): pega "mesmo topico, outras palavras".
//
// A Camada 1 funciona sem chave. A Camada 2 so entra quando ha provider de
// embeddings configurado (server/blog/embeddings.ts); sem ele, degrada para
// lexical apenas, sem quebrar o fluxo.
// ============================================================

import { sql, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { posts, blogPostIndex } from "@shared/schema";
import { getEmbeddingProvider, type InputType } from "./embeddings";

// Limiares calibraveis (Secao 5.8). Acima disso, tratamos como possivel duplicata.
export const LIMIAR_LEXICAL = 0.55; // similaridade de trigramas (0..1)
export const LIMIAR_SEMANTICO = 0.85; // cosseno em nivel de titulo (0..1)

export function normalizarTitulo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Texto embedado por post: titulo + resumo (o que pega "mesmo topico").
function textoDoPost(title: string, excerpt: string | null): string {
  return excerpt && excerpt.trim() ? `${title}\n${excerpt.trim()}` : title;
}

function vetorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export interface CorpusMatch {
  postId: number;
  titleNormalized: string;
  similarity: number; // 0..1
  camada: "lexical" | "semantica";
}

// --- Passo 0: ingerir e indexar o corpus (idempotente, reconstruivel). ---
// Percorre todos os posts, calcula titulo normalizado e (se houver provider)
// embedding de titulo+resumo, e faz upsert em blog_post_index. Em lotes.
export async function indexarCorpus(
  opts: { batchSize?: number; onlyMissing?: boolean } = {},
): Promise<{ total: number; comEmbedding: number }> {
  const { batchSize = 64, onlyMissing = false } = opts;
  const provider = getEmbeddingProvider();

  const todos = await db
    .select({ id: posts.id, title: posts.title, excerpt: posts.excerpt })
    .from(posts);

  let jaIndexados = new Set<number>();
  if (onlyMissing) {
    const idx = await db.select({ postId: blogPostIndex.postId }).from(blogPostIndex);
    jaIndexados = new Set(idx.map((r) => r.postId));
  }
  const alvo = onlyMissing ? todos.filter((p) => !jaIndexados.has(p.id)) : todos;

  let comEmbedding = 0;
  for (let i = 0; i < alvo.length; i += batchSize) {
    const lote = alvo.slice(i, i + batchSize);
    const textos = lote.map((p) => textoDoPost(p.title, p.excerpt));

    let embeddings: (number[] | null)[] = lote.map(() => null);
    if (provider) {
      embeddings = await provider.embed(textos, "document");
      comEmbedding += lote.length;
    }

    for (let j = 0; j < lote.length; j++) {
      const p = lote[j];
      const emb = embeddings[j];
      await db
        .insert(blogPostIndex)
        .values({
          postId: p.id,
          titleNormalized: normalizarTitulo(p.title),
          embeddedText: textos[j],
          embedding: emb ?? undefined,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: blogPostIndex.postId,
          set: {
            titleNormalized: normalizarTitulo(p.title),
            embeddedText: textos[j],
            ...(emb ? { embedding: emb } : {}),
            updatedAt: new Date(),
          },
        });
    }
  }

  return { total: alvo.length, comEmbedding };
}

// Mantem o indice em dia para um unico post (chamar ao publicar/atualizar).
export async function indexarPost(postId: number): Promise<void> {
  const [p] = await db
    .select({ id: posts.id, title: posts.title, excerpt: posts.excerpt })
    .from(posts)
    .where(eq(posts.id, postId));
  if (!p) return;
  const provider = getEmbeddingProvider();
  const texto = textoDoPost(p.title, p.excerpt);
  const emb = provider ? (await provider.embed([texto], "document"))[0] : null;
  await db
    .insert(blogPostIndex)
    .values({
      postId: p.id,
      titleNormalized: normalizarTitulo(p.title),
      embeddedText: texto,
      embedding: emb ?? undefined,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: blogPostIndex.postId,
      set: {
        titleNormalized: normalizarTitulo(p.title),
        embeddedText: texto,
        ...(emb ? { embedding: emb } : {}),
        updatedAt: new Date(),
      },
    });
}

// Garante a extensao pg_trgm (idempotente). Necessario porque o Publish
// sincroniza tabelas/colunas, mas nao extensoes que so fornecem funcoes —
// em producao a similarity() nao existia ate rodar isto uma vez.
let pgTrgmGarantido = false;
async function garantirPgTrgm(): Promise<void> {
  if (pgTrgmGarantido) return;
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  pgTrgmGarantido = true;
}

// --- Camada 1: lexical (pg_trgm). Barata, sem chave. ---
export async function candidatosLexicais(texto: string, k = 5): Promise<CorpusMatch[]> {
  const cand = normalizarTitulo(texto);
  if (!cand) return [];
  await garantirPgTrgm();
  const rows = await db.execute(sql`
    SELECT post_id, title_normalized,
           similarity(title_normalized, ${cand}) AS sim
    FROM blog_post_index
    WHERE similarity(title_normalized, ${cand}) > ${LIMIAR_LEXICAL}
    ORDER BY sim DESC
    LIMIT ${k}
  `);
  return (rows.rows as { post_id: number; title_normalized: string; sim: number }[]).map((r) => ({
    postId: r.post_id,
    titleNormalized: r.title_normalized,
    similarity: Number(r.sim),
    camada: "lexical" as const,
  }));
}

// --- Camada 2: semantica (pgvector, cosseno). So com provider configurado. ---
export async function candidatosSemanticos(
  texto: string,
  inputType: InputType = "query",
  k = 5,
): Promise<CorpusMatch[]> {
  const provider = getEmbeddingProvider();
  if (!provider) return [];
  const [vec] = await provider.embed([texto], inputType);
  if (!vec) return [];
  const lit = vetorLiteral(vec);
  const rows = await db.execute(sql`
    SELECT post_id, title_normalized,
           1 - (embedding <=> ${lit}::vector) AS cos_sim
    FROM blog_post_index
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${lit}::vector
    LIMIT ${k}
  `);
  return (rows.rows as { post_id: number; title_normalized: string; cos_sim: number }[]).map((r) => ({
    postId: r.post_id,
    titleNormalized: r.title_normalized,
    similarity: Number(r.cos_sim),
    camada: "semantica" as const,
  }));
}

export interface VerificacaoCanibalizacao {
  // Duplicata forte por qualquer camada acima do limiar.
  duplicataProvavel: boolean;
  maiorLexical: number;
  maiorSemantico: number | null; // null quando a Camada 2 esta desligada
  // Posts mais proximos (para auditoria/decisao humana).
  proximos: CorpusMatch[];
}

// Roda as duas camadas contra o corpus e decide se ha canibalizacao provavel.
// Usado nos dois checkpoints: ao enfileirar (titulo = a busca) e antes de
// publicar (titulo + corpo do rascunho).
export async function verificarCanibalizacao(texto: string): Promise<VerificacaoCanibalizacao> {
  const [lex, sem] = await Promise.all([
    candidatosLexicais(texto, 5),
    candidatosSemanticos(texto, "query", 5),
  ]);
  const provider = getEmbeddingProvider();
  const maiorLexical = lex.reduce((m, c) => Math.max(m, c.similarity), 0);
  const maiorSemantico = provider ? sem.reduce((m, c) => Math.max(m, c.similarity), 0) : null;

  const duplicataProvavel =
    maiorLexical > LIMIAR_LEXICAL || (maiorSemantico !== null && maiorSemantico > LIMIAR_SEMANTICO);

  // Junta e ordena os proximos por similaridade (dedup por postId).
  const porPost = new Map<number, CorpusMatch>();
  for (const c of [...sem, ...lex]) {
    const atual = porPost.get(c.postId);
    if (!atual || c.similarity > atual.similarity) porPost.set(c.postId, c);
  }
  const proximos = Array.from(porPost.values()).sort((a, b) => b.similarity - a.similarity);

  return { duplicataProvavel, maiorLexical, maiorSemantico, proximos };
}

// Resolve postId -> {title, slug} para relatorios/auditoria da fila.
export async function detalhesDosPosts(
  ids: number[],
): Promise<Map<number, { title: string; slug: string }>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: posts.id, title: posts.title, slug: posts.slug })
    .from(posts)
    .where(inArray(posts.id, ids));
  return new Map(rows.map((r) => [r.id, { title: r.title, slug: r.slug }]));
}

// Piso de relacionamento semantico para CITACAO CRUZADA. A faixa util e
// [LIMIAR_CITACAO, LIMIAR_SEMANTICO): relacionado ao tema, mas NAO duplicata
// (o que passa de LIMIAR_SEMANTICO e canibalizacao, nao citacao).
export const LIMIAR_CITACAO = 0.35;

export interface PostParaCitar {
  postId: number;
  slug: string;
  title: string;
  similarity: number;
}

// Posts EXISTENTES relacionados (nao duplicatas) para o gerador citar com link
// interno. So semantico (a citacao cruzada precisa do "mesmo tema, outras
// palavras"); sem provider de embeddings, devolve [] e nao ha citacao cruzada.
export async function postsRelacionadosParaCitar(texto: string, k = 5): Promise<PostParaCitar[]> {
  const sem = await candidatosSemanticos(texto, "query", Math.max(k * 3, 12));
  const rel = sem
    .filter((c) => c.similarity >= LIMIAR_CITACAO && c.similarity < LIMIAR_SEMANTICO)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
  const detalhes = await detalhesDosPosts(rel.map((c) => c.postId));
  const out: PostParaCitar[] = [];
  for (const c of rel) {
    const d = detalhes.get(c.postId);
    if (d) out.push({ postId: c.postId, slug: d.slug, title: d.title, similarity: c.similarity });
  }
  return out;
}
