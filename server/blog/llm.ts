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
      if (json.stop_reason === "max_tokens") {
        // Saida truncada: JSON viria quebrado. Erro explicito (retryavel pelo
        // chamarLLMJson, que refaz a chamada).
        throw new Error(`Resposta truncada pela IA (max_tokens=${body.max_tokens}).`);
      }
      return text;
    } catch (err) {
      ultimoErro = err;
      // AbortError/rede: tenta de novo; erro de request (4xx != 429): propaga.
      if (t < tentativas - 1) await dormir(2000 * 2 ** t);
    }
  }
  throw ultimoErro;
}

// Chamada + parse de JSON com nova tentativa: se a resposta vier truncada ou
// com JSON invalido (ex.: caractere sem escape), refaz a chamada — uma nova
// amostragem do modelo normalmente resolve.
export async function chamarLLMJson(p: LlmParams, tentativasParse = 3): Promise<unknown> {
  let ultimoErro: unknown;
  let maxTokens = p.maxTokens ?? 8000; // default do chamarLLM, explicitado para poder escalar
  for (let t = 0; t < tentativasParse; t++) {
    try {
      const raw = await chamarLLM({ ...p, maxTokens });
      return parseJsonDaIA(raw);
    } catch (err) {
      ultimoErro = err;
      // So refaz a chamada para erros de parse (SyntaxError) ou truncamento.
      // Outros erros (auth, 4xx, rede apos os retries do chamarLLM) propagam
      // direto — repetir seria custo sem chance de resultado diferente.
      const retryavel =
        err instanceof SyntaxError ||
        (err instanceof Error && err.message.includes("truncada"));
      if (!retryavel) throw err;
      // Se realmente truncou por max_tokens, aumenta o teto na proxima
      // tentativa (ate 32000) — repetir com o mesmo teto tende a truncar de novo.
      if (err instanceof Error && err.message.includes("truncada") && maxTokens) {
        maxTokens = Math.min(Math.ceil(maxTokens * 1.5), 32000);
      }
      if (t < tentativasParse - 1) {
        console.warn(
          `[llm] JSON invalido/truncado (tentativa ${t + 1}/${tentativasParse}), refazendo chamada:`,
          err.message,
        );
      }
    }
  }
  throw ultimoErro;
}

// Extrai JSON da resposta da IA (tolera cercas ```json e texto ao redor).
export function parseJsonDaIA(raw: string): unknown {
  let text = raw.trim();
  // So usa cerca se o CONTEUDO dela for JSON (comeca com { ou [). Candidatos, do mais provavel ao mais tolerante. O JSON pode conter cercas
  // internas (ex.: bloco ```r dentro de uma string do corpo), entao uma unica
  // regex de cerca nao resolve todos os casos:
  // 1. cerca non-greedy (primeiro bloco fechado — resposta com varios blocos);
  // 2. cerca greedy ate a ULTIMA cerca (JSON unico com cercas internas);
  // 3. recorte do primeiro {/[ ao ultimo }/] do texto bruto.
  const candidatos: string[] = [];
  const fenceNonGreedy = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceNonGreedy && /^[{[]/.test(fenceNonGreedy[1].trim())) candidatos.push(fenceNonGreedy[1].trim());
  const fenceGreedy = text.match(/```(?:json)?\s*([\s\S]*)```/);
  if (fenceGreedy && /^[{[]/.test(fenceGreedy[1].trim())) candidatos.push(fenceGreedy[1].trim());
  const primeiro = text.search(/[{[]/);
  const ultimo = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (primeiro !== -1 && ultimo !== -1 && ultimo > primeiro) {
    candidatos.push(text.slice(primeiro, ultimo + 1));
  }
  if (candidatos.length === 0) candidatos.push(text);

  let ultimoErro: unknown;
  for (const cand of candidatos) {
    // Recorta cada candidato ao trecho JSON (tolera prosa apos a cerca).
    const ini = cand.search(/[{[]/);
    const fim = Math.max(cand.lastIndexOf("}"), cand.lastIndexOf("]"));
    const texto = ini !== -1 && fim > ini ? cand.slice(ini, fim + 1) : cand;
    try {
      return JSON.parse(texto);
    } catch (err) {
      ultimoErro = err;
    }
  }
  {
    const err = ultimoErro;
    try {
      mkdirSync(".local/tmp", { recursive: true });
      writeFileSync(`.local/tmp/llm-parse-fail-${Date.now()}.txt`, raw);
    } catch {}
    throw err;
  }
}
