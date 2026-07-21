// ============================================================
// Fase 3 — despertador do gerador diario de rascunhos.
//
// Duas portas de entrada, ambas terminando em rodarProximaGeracao():
//   1. Endpoint interno POST /api/internal/blog/generate-next protegido por
//      token (somente Authorization: Bearer) — para cron externo/stack chamar.
//      O token vem de BLOG_CRON_TOKEN (env/secret) ou, na ausencia, e gerado
//      automaticamente e guardado em site_settings (blog_cron_token), como o
//      indexnow_key — nunca fica versionado no repositorio.
//   2. Despertador embutido: um tick por minuto; quando bate a hora configurada
//      (BLOG_CRON_HORA, default 06:00, fuso America/Sao_Paulo) dispara a rodada
//      do dia, processando um cluster por vez ate remaining=0 ou o cap diario
//      (BLOG_MAX_POSTS_DIA) — o proprio rodarProximaGeracao respeita o cap.
//
// Nunca publica: os posts entram sempre como rascunho para revisao humana.
// ============================================================

import { randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db, pool } from "../db";
import { blogKeywordQueue } from "@shared/schema";
import { storage } from "../storage";
import { rodarProximaGeracao, type RunStatus } from "./daily-generator";

// Token do cron: BLOG_CRON_TOKEN (secret) tem prioridade; senao, gera e guarda
// em site_settings (mesmo padrao do indexnow_key).
export async function getOrCreateBlogCronToken(): Promise<string> {
  const env = process.env.BLOG_CRON_TOKEN?.trim();
  if (env) return env;
  let token = (await storage.getSetting("blog_cron_token"))?.trim();
  if (!token || token.length < 32) {
    token = randomBytes(32).toString("hex");
    await storage.setSetting("blog_cron_token", token);
  }
  return token;
}

const TIMEZONE = "America/Sao_Paulo";

function horaAgendada(): string {
  const v = (process.env.BLOG_CRON_HORA || "06:00").trim();
  return /^\d{2}:\d{2}$/.test(v) ? v : "06:00";
}

function agoraNoFuso(): { hhmm: string; dia: string } {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    hhmm: `${get("hour")}:${get("minute")}`,
    dia: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

let rodando = false;
let ultimoDiaDisparado: string | null = null;

// Lock distribuido no Postgres: serializa a geracao entre instancias/processos
// (autoscale pode rodar mais de uma instancia; o flag `rodando` so cobre o
// processo local). Mantem a MESMA conexao do pool durante todo o trabalho —
// advisory locks sao por sessao.
const LOCK_GERACAO = 771203991;
async function comLockGlobal<T>(fn: () => Promise<T>): Promise<T | null> {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_GERACAO]);
    if (!r.rows[0]?.ok) return null;
    try {
      return await fn();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_GERACAO]);
    }
  } finally {
    client.release();
  }
}

export interface ResultadoRodada {
  processados: { macro: string; status: RunStatus | null }[];
  rascunhosCriados: number;
  remaining: number;
}

// Roda geracoes em sequencia ate remaining=0 (fila vazia ou cap diario).
// Serializado: se ja ha uma rodada em andamento, retorna null.
export async function rodarRodadaDiaria(maxIteracoes = 20): Promise<ResultadoRodada | null> {
  if (rodando) return null;
  rodando = true;
  try {
    return await comLockGlobal(async () => {
      const resultado: ResultadoRodada = { processados: [], rascunhosCriados: 0, remaining: 0 };
      for (let i = 0; i < maxIteracoes; i++) {
        const r = await rodarProximaGeracao();
        resultado.remaining = r.remaining;
        if (r.processed === null) break;
        resultado.processados.push({ macro: r.processed, status: r.status });
        if (r.status === "draft") resultado.rascunhosCriados += 1;
        console.log(`[blog-scheduler] [${r.status}] eixo="${r.processed}" restam~${r.remaining}`);
        if (r.remaining === 0) break;
      }
      console.log(
        `[blog-scheduler] Rodada concluida: ${resultado.rascunhosCriados} rascunho(s), ` +
          `${resultado.processados.length} cluster(s) processado(s).`,
      );
      return resultado;
    });
  } finally {
    rodando = false;
  }
}

async function tokenValido(req: Request): Promise<boolean> {
  const esperado = await getOrCreateBlogCronToken();
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!bearer || bearer.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(bearer), Buffer.from(esperado));
}

export function registerBlogScheduler(app: Express): void {
  // Endpoint interno: processa UM cluster por chamada (cron externo chama
  // repetidamente ate remaining=0). Com ?all=1, roda a rodada completa.
  app.post("/api/internal/blog/generate-next", async (req: Request, res: Response) => {
    if (!(await tokenValido(req))) {
      return res.status(401).json({ message: "Nao autorizado" });
    }
    try {
      if (req.query.all === "1") {
        const rodada = await rodarRodadaDiaria();
        if (!rodada) return res.status(409).json({ message: "Rodada ja em andamento" });
        return res.json(rodada);
      }
      if (rodando) return res.status(409).json({ message: "Rodada ja em andamento" });
      rodando = true;
      let r;
      try {
        r = await comLockGlobal(() => rodarProximaGeracao());
      } finally {
        rodando = false;
      }
      if (!r) return res.status(409).json({ message: "Rodada ja em andamento" });
      return res.json(r);
    } catch (err) {
      console.error("[blog-scheduler] Falha na geracao:", err);
      return res.status(500).json({ message: err instanceof Error ? err.message : "Erro na geracao" });
    }
  });

  // Endpoint interno: importa linhas da fila de palavras-chave (usado para
  // levar a fila do ambiente de desenvolvimento para a producao). Upsert por
  // query_normalized: linhas ja existentes sao ignoradas.
  const linhaImportSchema = z.object({
    query: z.string().min(1),
    queryNormalized: z.string().min(1),
    macro: z.string().min(1),
    subcategoria: z.string().nullable().optional(),
    isQuestion: z.boolean().optional(),
    score: z.number().int().optional(),
    priority: z.number().int().optional(),
    lang: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(["pending", "used", "skipped"]).optional(),
    skipReason: z.string().nullable().optional(),
  });
  app.post("/api/internal/blog/keyword-queue/import", async (req: Request, res: Response) => {
    if (!(await tokenValido(req))) {
      return res.status(401).json({ message: "Nao autorizado" });
    }
    const parsed = z.array(linhaImportSchema).max(500).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Corpo invalido", issues: parsed.error.issues.slice(0, 3) });
    }
    try {
      let inseridas = 0;
      for (const linha of parsed.data) {
        const r = await db
          .insert(blogKeywordQueue)
          .values(linha)
          .onConflictDoNothing({ target: blogKeywordQueue.queryNormalized })
          .returning({ id: blogKeywordQueue.id });
        inseridas += r.length;
      }
      return res.json({ recebidas: parsed.data.length, inseridas });
    } catch (err) {
      console.error("[blog-scheduler] Falha no import da fila:", err);
      return res.status(500).json({ message: err instanceof Error ? err.message : "Erro no import" });
    }
  });

  // Despertador embutido: DESLIGADO por padrao. O gatilho oficial e o projeto
  // paralelo (scheduled deployment) batendo no endpoint acima, para nao haver
  // dois disparos. Para religar o embutido (ex.: ambiente sem cron externo),
  // defina BLOG_CRON_EMBUTIDO=1. BLOG_CRON_DISABLED=1 continua forcando off.
  if (process.env.BLOG_CRON_EMBUTIDO !== "1" || process.env.BLOG_CRON_DISABLED === "1") {
    console.log(
      "[blog-scheduler] Despertador embutido desligado; usando o gatilho externo (endpoint). " +
        "Para religar: BLOG_CRON_EMBUTIDO=1.",
    );
    return;
  }
  setInterval(async () => {
    try {
      const { hhmm, dia } = agoraNoFuso();
      if (hhmm !== horaAgendada() || ultimoDiaDisparado === dia) return;
      ultimoDiaDisparado = dia;
      console.log(`[blog-scheduler] Despertador: iniciando rodada diaria (${dia} ${hhmm} ${TIMEZONE}).`);
      await rodarRodadaDiaria();
    } catch (err) {
      console.error("[blog-scheduler] Erro no despertador:", err);
    }
  }, 60_000);
  console.log(`[blog-scheduler] Despertador ativo: rodada diaria as ${horaAgendada()} (${TIMEZONE}).`);
}
