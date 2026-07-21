// ============================================================
// Orquestracao diaria (Fase 1). UM POST POR CLUSTER (subcategoria): a busca mais
// forte vira o H1; as irmas do cluster viram H2/FAQ; o cluster inteiro e
// consumido de uma vez (evita gerar 40 posts rasos do mesmo conceito).
//
// Pipeline por cluster:
//   esboco -> expansao -> revisor (Opus 4.8, ate 2 correcoes) ->
//   gate de citacoes por DOI (resolve-ou-remove) ->
//   checkpoint anti-canibalizacao Camada 2 (semantica) ->
//   persiste como RASCUNHO no CMS -> marca o cluster usado -> log em blog_daily_runs.
//
// Nunca publica: sempre rascunho para revisao humana (Secao 7). Escreve na
// tabela posts de producao -> rodar no Replit.
// ============================================================

import { and, eq, gte } from "drizzle-orm";
import { db } from "../db";
import { blogDailyRuns } from "@shared/schema";
import { eixoPorMacro, MACRO_NOMES, type Eixo } from "@shared/blog/seeds";
import {
  proximoAlvo,
  linhasDoCluster,
  perguntasDoCluster,
  marcarClusterUsado,
  marcarClusterDescartado,
} from "./keyword-queue";
import {
  gerarEsboco,
  expandirPost,
  revisarPost,
  corrigirPost,
  type GeneratedPost,
  type VerificationResult,
} from "./blog-generator";
import { resolverReferencias, type ResultadoCitacoes } from "./citations";
import { verificarCanibalizacao, indexarCorpus, postsRelacionadosParaCitar } from "./corpus-index";
import { persistGeneratedPost } from "./blog-posts";

export type RunStatus = "draft" | "rejected" | "skipped" | "failed";

const MAX_CORRECOES = 2;
function capDiario(): number {
  const v = Number(process.env.BLOG_MAX_POSTS_DIA);
  return Number.isInteger(v) && v > 0 ? v : 3;
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function registrarRun(entry: {
  macro: string;
  status: RunStatus;
  reason?: string | null;
  title?: string | null;
  postId?: number | null;
  correctionRounds?: number;
}): Promise<void> {
  await db.insert(blogDailyRuns).values({
    runDate: hojeIso(),
    macro: entry.macro,
    status: entry.status,
    reason: entry.reason ?? null,
    title: entry.title ?? null,
    postId: entry.postId ?? null,
    correctionRounds: entry.correctionRounds ?? 0,
  });
}

export interface GeracaoRevisada {
  post: GeneratedPost;
  verificacao: VerificationResult;
  correcoes: number;
  citacoes: ResultadoCitacoes;
}

// Gera, revisa (ate 2 correcoes) e resolve as citacoes por DOI (resolve-ou-
// remove). NAO persiste nem toca a fila — reusado pelo gerador diario e pelo
// preview. As referencias do post retornado ja sao as canonicas resolvidas.
export async function gerarRevisarCitar(
  eixo: Eixo,
  targetQuery: string,
  relacionadas: string[],
  subcategoria: string | null,
): Promise<GeracaoRevisada> {
  const esboco = await gerarEsboco(eixo, targetQuery, relacionadas);

  // Citacao cruzada: posts existentes relacionados (nao duplicatas) para o
  // gerador citar com link interno, de forma natural, no meio do texto.
  const relacionadosPosts = await postsRelacionadosParaCitar(esboco.h1 || targetQuery, 5);
  const internalLinks = relacionadosPosts.map((p) => ({ slug: p.slug, title: p.title }));

  let post = await expandirPost(eixo, esboco, targetQuery, relacionadas, subcategoria, internalLinks);

  // Revisor + correcao guiada.
  let verificacao = await revisarPost(eixo, targetQuery, post);
  let correcoes = 0;
  while (!verificacao.aprovado && correcoes < MAX_CORRECOES) {
    correcoes += 1;
    post = await corrigirPost(eixo, targetQuery, post, verificacao);
    verificacao = await revisarPost(eixo, targetQuery, post);
  }

  // Gate de citacoes: resolve-ou-remove. Uma passada de correcao para remover/
  // substituir as nao confirmadas antes de dropar da lista.
  let citacoes = await resolverReferencias(post.referencias);
  if (!citacoes.todasResolvidas && post.referencias.length > 0) {
    const problema: VerificationResult = {
      aprovado: false,
      motivos: [
        `Remover ou substituir por referencia real (com DOI) as citacoes NAO confirmadas: ${citacoes.naoResolvidas
          .map((r) => `"${r}"`)
          .join("; ")}. Se substituir, use obra real e consolidada; se nao houver, reescreva a frase sem a atribuicao.`,
      ],
      checagens: [],
    };
    post = await corrigirPost(eixo, targetQuery, post, problema);
    citacoes = await resolverReferencias(post.referencias);
  }
  // Adota as canonicas resolvidas; descarta as ainda nao confirmadas.
  post.referencias = citacoes.itens.filter((i) => i.resolvida).map((i) => i.canonical ?? i.original);

  // Anexa os posts relacionados: o render so vira <a> os slugs desta lista
  // (allowlist), garantindo que nenhum link interno gerado seja quebrado.
  post.internalLinks = internalLinks;

  return { post, verificacao, correcoes, citacoes };
}

// Processa UM cluster do eixo (o mais forte pendente). Retorna o status.
export async function processarProximoCluster(macro: string): Promise<RunStatus | null> {
  const eixo = eixoPorMacro(macro);
  if (!eixo) return null;

  const alvo = await proximoAlvo(macro);
  if (!alvo) return null; // eixo sem pendencias

  const cluster = await linhasDoCluster(macro, alvo.subcategoria, alvo.id);
  const ids = cluster.map((c) => c.id);
  // A busca-alvo e a mais forte do cluster (proximoAlvo ja ordena); as irmas
  // (perguntas) alimentam H2 e FAQ.
  const irmas = await perguntasDoCluster(macro, alvo.subcategoria, alvo.id, 8);
  const relacionadas = irmas.map((i) => i.query);

  try {
    const { post, verificacao, correcoes, citacoes } = await gerarRevisarCitar(
      eixo,
      alvo.query,
      relacionadas,
      alvo.subcategoria,
    );

    if (!verificacao.aprovado) {
      const reason = `Reprovado apos ${correcoes} correcao(oes): ${verificacao.motivos.join(" | ")}`;
      await marcarClusterDescartado(ids, reason);
      await registrarRun({ macro, status: "rejected", title: post.title, reason, correctionRounds: correcoes });
      return "rejected";
    }

    // Checkpoint anti-canibalizacao Camada 2 (semantica) antes de gravar.
    const canib = await verificarCanibalizacao(`${post.title}\n${post.excerpt}`);
    if (canib.duplicataProvavel) {
      const alvoPost = canib.proximos[0];
      const reason = `Anti-canibalizacao: muito proximo do post #${alvoPost?.postId} ` +
        `(lexical ${canib.maiorLexical.toFixed(2)}, semantico ${canib.maiorSemantico?.toFixed(2) ?? "-"}). ` +
        `Revisao humana: consolidar/atualizar o existente em vez de criar concorrente.`;
      await marcarClusterDescartado(ids, reason);
      await registrarRun({ macro, status: "skipped", title: post.title, reason, correctionRounds: correcoes });
      return "skipped";
    }

    const created = await persistGeneratedPost(post, eixo, { publish: false, targetQuery: alvo.query });
    await marcarClusterUsado(ids, created.id);

    const notaCit =
      citacoes.naoResolvidas.length > 0
        ? ` ${citacoes.naoResolvidas.length} citacao(oes) nao confirmada(s) foram removidas — conferir na revisao.`
        : ` Todas as ${citacoes.itens.length} referencias resolvidas por DOI.`;
    await registrarRun({
      macro,
      status: "draft",
      title: created.title,
      postId: created.id,
      correctionRounds: correcoes,
      reason: `Rascunho do cluster "${alvo.subcategoria ?? alvo.query}" (ancorado em "${alvo.query}").${notaCit}`,
    });
    return "draft";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await registrarRun({ macro, status: "failed", reason: msg }).catch(() => {});
    return "failed";
  }
}

// Quantos rascunhos ja foram criados hoje (para o cap diario).
async function rascunhosHoje(): Promise<number> {
  const runs = await db
    .select({ id: blogDailyRuns.id })
    .from(blogDailyRuns)
    .where(and(eq(blogDailyRuns.runDate, hojeIso()), eq(blogDailyRuns.status, "draft")));
  return runs.length;
}

// Processa UM cluster do proximo eixo com pendencias, respeitando o cap diario.
// Feito para o despertador chamar repetidamente ate remaining=0.
export async function rodarProximaGeracao(): Promise<{
  processed: string | null;
  status: RunStatus | null;
  remaining: number;
}> {
  const capRestante = Math.max(0, capDiario() - (await rascunhosHoje()));
  if (capRestante === 0) return { processed: null, status: null, remaining: 0 };

  // Mantem o indice anti-canibalizacao em dia (so posts ainda nao indexados;
  // barato quando ja esta completo). Essencial em producao, onde o banco novo
  // comeca com o indice vazio.
  try {
    const idx = await indexarCorpus({ onlyMissing: true });
    if (idx.total > 0) console.log(`[daily-generator] Corpus indexado: +${idx.total} post(s).`);
  } catch (err) {
    console.error("[daily-generator] Falha ao indexar corpus:", err);
    throw err;
  }

  for (const macro of MACRO_NOMES) {
    const alvo = await proximoAlvo(macro);
    if (!alvo) continue;
    const status = await processarProximoCluster(macro);
    // Recomputa o cap restante apos o processamento: so conta contra a cota
    // quando um rascunho foi de fato criado (status "draft" registrado).
    const capAposProcesso = Math.max(0, capDiario() - (await rascunhosHoje()));
    let aindaTem = false;
    for (const m of MACRO_NOMES) {
      if (await proximoAlvo(m)) {
        aindaTem = true;
        break;
      }
    }
    const remaining = aindaTem ? capAposProcesso : 0;
    return { processed: macro, status, remaining };
  }
  return { processed: null, status: null, remaining: 0 };
}
