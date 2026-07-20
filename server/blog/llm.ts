// ============================================================
// Provider de LLM do gerador/revisor (Fase 1).
//
// Chama a API Messages da Anthropic via fetch (sem dependencia nova no repo
// compartilhado). Decisao do dono: ESCRITOR = Claude Sonnet 5, REVISOR =
// Claude Opus 4.8 (o topo de qualidade no filtro critico de correcao).
//
// Trocavel sem reescrever nada: se o LLM ficar atras de um endpoint do Replit,
// basta setar ANTHROPIC_BASE_URL para esse endpoint (contrato Messages). A
// chave vem de ANTHROPIC_API_KEY.
// ============================================================

import { mkdirSync, writeFileSync } from "fs";

export const MODEL_ESCRITOR = process.env.BLOG_MODEL_ESCRITOR || "claude-sonnet-5";
export const MODEL_REVISOR = process.env.BLOG_MODEL_REVISOR || "claude-opus-4-8";

const BASE = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
const ANTHROPIC_VERSION = "2023-06-01";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface LlmParams {
  model: string;
  system: string;
  user: string;
  // Teto de saida por chamada. Mantido <= 16000 e a geracao e feita em passos
  // (esboco -> expansao) para nao truncar nem exigir streaming.
  maxTokens?: number;
  effort?: Effort;
  // Liga o raciocinio adaptativo (usado no revisor, para rigor tecnico).
  thinking?: boolean;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Uma chamada ao LLM. Retry com backoff em erros transitorios (429/5xx/rede).
export async function chamarLLM(p: LlmParams, tentativas = 3): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY nao configurada (necessaria na Fase 1).");

  const body: Record<string, unknown> = {
    model: p.model,
    max_tokens: p.maxTokens ?? 8000,
    system: p.system,
    messages: [{ role: "user", content: p.user }],
  };
  if (p.effort) body.output_config = { effort: p.effort };
  if (p.thinking) body.thinking = { type: "adaptive" };

  let ultimoErro: unknown;
  for (let t = 0; t < tentativas; t++) {
    try {
      const resp = await fetch(`${BASE}/v1/messages`, {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(600000),
      });
      if (resp.status === 429 || resp.status >= 500) {
        ultimoErro = new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
        if (t < tentativas - 1) await dormir(2000 * 2 ** t);
        continue;
      }
      if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
      const json = (await resp.json()) as AnthropicResponse;
      const text = (json.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      if (!text) throw new Error(`Resposta vazia da IA (stop_reason=${json.stop_reason}).`);
      return text;
    } catch (err) {
      ultimoErro = err;
      // AbortError/rede: tenta de novo; erro de request (4xx != 429): propaga.
      if (t < tentativas - 1) await dormir(2000 * 2 ** t);
    }
  }
  throw ultimoErro;
}

// Extrai JSON da resposta da IA (tolera cercas ```json e texto ao redor).
export function parseJsonDaIA(raw: string): unknown {
  let text = raw.trim();
  // So usa a cerca se o CONTEUDO dela for JSON (comeca com { ou [). Sem isso,
  // uma cerca ```r ... ``` DENTRO de uma string do JSON (aula em R) seria
  // capturada e quebraria o parse.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence && /^[{[]/.test(fence[1].trim())) text = fence[1].trim();
  const primeiro = text.search(/[{[]/);
  const ultimo = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (primeiro !== -1 && ultimo !== -1 && ultimo > primeiro) {
    text = text.slice(primeiro, ultimo + 1);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      mkdirSync(".local/tmp", { recursive: true });
      writeFileSync(`.local/tmp/llm-parse-fail-${Date.now()}.txt`, raw);
    } catch {}
    throw err;
  }
}
