// ============================================================
// Persistencia da fila de palavras-chave (Fase 0).
//
// Ponte entre o minerador (keyword-research.ts, puro) e a tabela
// blog_keyword_queue. Idempotente: gravar as mesmas sugestoes de novo nao
// duplica; so reforca o score (indice unico em query_normalized).
//
// Anti-canibalizacao no CHECKPOINT DE ENFILEIRAR (Secao 5.8): antes de gravar
// uma busca, roda a Camada 1 (lexical/pg_trgm) contra o corpus de 500+ posts. Se
// ja houver post cobrindo a intencao, marca a busca como "skipped" com ponteiro
// para o post (auditoria), em vez de enfileirar. A Camada 2 (semantica) roda no
// checkpoint antes de publicar (Fase 1), um rascunho por vez.
// ============================================================

import { sql, and, eq, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { blogKeywordQueue, posts, type BlogKeywordQueue } from "@shared/schema";
import type { SugestaoMinerada } from "./keyword-research";
import { normalizarQuery } from "./keyword-research";
import { isRelevante } from "./keyword-filter";
import { candidatosLexicais, detalhesDosPosts, LIMIAR_LEXICAL } from "./corpus-index";

export interface ResultadoEnfileiramento {
  novas: number;
  reforcadas: number;
  ignoradas: number; // ruido/off-topic (filtro)
  canibalizadas: number; // ja cobertas por post existente (anti-canibalizacao)
}

// Grava (ou reforca) sugestoes mineradas de um cluster (semente) de um eixo.
// `priority` vem da curadoria editorial da semente (shared/blog/seeds.ts).
export async function enfileirarSugestoes(
  macro: string,
  subcategoria: string | null,
  priority: number,
  sugestoes: SugestaoMinerada[],
): Promise<ResultadoEnfileiramento> {
  const res: ResultadoEnfileiramento = { novas: 0, reforcadas: 0, ignoradas: 0, canibalizadas: 0 };
  if (sugestoes.length === 0) return res;

  // Titulos ja publicados (normalizados) para dedup exato barato contra conteudo.
  const titulos = await db.select({ title: posts.title }).from(posts);
  const titulosNorm = new Set(titulos.map((p) => normalizarQuery(p.title)));

  for (const s of sugestoes) {
    if (!isRelevante(s.query)) {
      res.ignoradas += 1;
      continue;
    }
    if (titulosNorm.has(s.queryNormalized)) {
      res.canibalizadas += 1;
      continue;
    }

    // Camada 1 (lexical): a busca ja e coberta por um post existente?
    const lex = await candidatosLexicais(s.query, 1);
    if (lex.length > 0 && lex[0].similarity > LIMIAR_LEXICAL) {
      res.canibalizadas += 1;
      // Registra a busca como skipped com ponteiro (auditoria), sem competir.
      await db
        .insert(blogKeywordQueue)
        .values({
          query: s.query,
          queryNormalized: s.queryNormalized,
          macro,
          subcategoria,
          isQuestion: s.isQuestion,
          score: s.score,
          priority,
          lang: s.lang,
          source: "autocomplete",
          status: "skipped",
          skipReason: `coberto pelo post #${lex[0].postId} (lexical ${lex[0].similarity.toFixed(2)})`,
          usedPostId: lex[0].postId,
        })
        .onConflictDoNothing({ target: blogKeywordQueue.queryNormalized });
      continue;
    }

    const resultado = await db
      .insert(blogKeywordQueue)
      .values({
        query: s.query,
        queryNormalized: s.queryNormalized,
        macro,
        subcategoria,
        isQuestion: s.isQuestion,
        score: s.score,
        priority,
        lang: s.lang,
        source: "autocomplete",
        status: "pending",
      })
      .onConflictDoUpdate({
        target: blogKeywordQueue.queryNormalized,
        set: {
          score: sql`${blogKeywordQueue.score} + ${s.score}`,
          priority: sql`greatest(${blogKeywordQueue.priority}, ${priority})`,
        },
      })
      .returning({ discoveredAt: blogKeywordQueue.discoveredAt });

    const criadaAgora =
      resultado[0] && Date.now() - new Date(resultado[0].discoveredAt).getTime() < 5000;
    if (criadaAgora) res.novas += 1;
    else res.reforcadas += 1;
  }

  return res;
}

// Proximas perguntas pendentes de um eixo, mais fortes primeiro. Ordena por
// PRIORITY (curadoria) e desempata por SCORE (demanda) — Secao 5.3: sementes
// curadas de baixo volume ainda saem na frente. Filtra ruido em memoria.
export async function proximasPendentes(macro: string, limite = 10): Promise<BlogKeywordQueue[]> {
  const candidatos = await db
    .select()
    .from(blogKeywordQueue)
    .where(and(eq(blogKeywordQueue.macro, macro), eq(blogKeywordQueue.status, "pending")))
    .orderBy(desc(blogKeywordQueue.priority), desc(blogKeywordQueue.score))
    .limit(Math.max(limite * 10, 50));
  return candidatos.filter((c) => isRelevante(c.query)).slice(0, limite);
}

// Perguntas-irmas do MESMO cluster (subcategoria) de uma alvo, para os H2 e a
// secao "Perguntas frequentes". So perguntas, mais fortes primeiro.
export async function perguntasDoCluster(
  macro: string,
  subcategoria: string | null,
  excluirId: number,
  limite = 5,
): Promise<BlogKeywordQueue[]> {
  const condicoes = [
    eq(blogKeywordQueue.macro, macro),
    eq(blogKeywordQueue.status, "pending"),
    eq(blogKeywordQueue.isQuestion, true),
  ];
  if (subcategoria) condicoes.push(eq(blogKeywordQueue.subcategoria, subcategoria));
  const linhas = await db
    .select()
    .from(blogKeywordQueue)
    .where(and(...condicoes))
    .orderBy(desc(blogKeywordQueue.priority), desc(blogKeywordQueue.score))
    .limit(Math.max((limite + 1) * 8, 40));
  return linhas.filter((l) => l.id !== excluirId && isRelevante(l.query)).slice(0, limite);
}

export async function marcarComoUsada(id: number, postId: number): Promise<void> {
  await db
    .update(blogKeywordQueue)
    .set({ status: "used", usedPostId: postId, usedAt: new Date() })
    .where(eq(blogKeywordQueue.id, id));
}

export async function marcarComoDescartada(id: number, motivo?: string): Promise<void> {
  await db
    .update(blogKeywordQueue)
    .set({ status: "skipped", skipReason: motivo ?? null, usedAt: new Date() })
    .where(eq(blogKeywordQueue.id, id));
}

// ---- Consolidacao por cluster (Fase 1) ----
// O post e por CLUSTER (subcategoria), nao por busca: o alvo e a busca mais
// forte; as irmas viram H2/FAQ; e o cluster inteiro e consumido de uma vez.
// Assim nao se gera um segundo post do mesmo conceito (a redundancia da fila
// vira UM post denso, nao 40 rasos).

// Proxima busca-alvo pendente do eixo (a mais forte por priority > score).
export async function proximoAlvo(macro: string): Promise<BlogKeywordQueue | null> {
  const [alvo] = await proximasPendentes(macro, 1);
  return alvo ?? null;
}

// Todas as buscas pendentes do mesmo cluster (subcategoria) do eixo. Se a
// subcategoria for nula, o cluster e so a propria linha-alvo.
export async function linhasDoCluster(
  macro: string,
  subcategoria: string | null,
  alvoId: number,
): Promise<BlogKeywordQueue[]> {
  if (!subcategoria) {
    const [linha] = await db.select().from(blogKeywordQueue).where(eq(blogKeywordQueue.id, alvoId));
    return linha ? [linha] : [];
  }
  return db
    .select()
    .from(blogKeywordQueue)
    .where(
      and(
        eq(blogKeywordQueue.macro, macro),
        eq(blogKeywordQueue.subcategoria, subcategoria),
        eq(blogKeywordQueue.status, "pending"),
      ),
    );
}

// Marca o cluster inteiro como usado (ligado ao post gerado).
export async function marcarClusterUsado(ids: number[], postId: number): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(blogKeywordQueue)
    .set({ status: "used", usedPostId: postId, usedAt: new Date() })
    .where(inArray(blogKeywordQueue.id, ids));
}

// Marca o cluster inteiro como descartado, com motivo (canibalizacao, reprovado...).
export async function marcarClusterDescartado(ids: number[], motivo: string): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(blogKeywordQueue)
    .set({ status: "skipped", skipReason: motivo, usedAt: new Date() })
    .where(inArray(blogKeywordQueue.id, ids));
}

// Varre a fila pendente e descarta o que o filtro recusa (limpeza de uma vez).
export async function limparFilaIrrelevante(): Promise<{ analisadas: number; descartadas: number }> {
  const pendentes = await db
    .select({ id: blogKeywordQueue.id, query: blogKeywordQueue.query })
    .from(blogKeywordQueue)
    .where(eq(blogKeywordQueue.status, "pending"));
  const idsLixo = pendentes.filter((r) => !isRelevante(r.query)).map((r) => r.id);
  const LOTE = 500;
  for (let i = 0; i < idsLixo.length; i += LOTE) {
    await db
      .update(blogKeywordQueue)
      .set({ status: "skipped", skipReason: "filtro de ruido", usedAt: new Date() })
      .where(inArray(blogKeywordQueue.id, idsLixo.slice(i, i + LOTE)));
  }
  return { analisadas: pendentes.length, descartadas: idsLixo.length };
}

// Re-exporta para relatorios da CLI.
export { detalhesDosPosts };
