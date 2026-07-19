// ============================================================
// Provider de embeddings para a anti-canibalizacao semantica (Secao 5.8,
// Camada 2). Abstrai o fornecedor por env var, pois a Anthropic (o LLM do
// gerador/revisor) NAO tem API de embeddings — usamos um modelo multilingue
// barato (Voyage, recomendado; ou OpenAI) que case com EMBEDDING_DIM=1024.
//
// Configuracao (no Replit):
//   BLOG_EMBEDDING_PROVIDER = "voyage" | "openai"
//   BLOG_EMBEDDING_API_KEY  = <chave do provider>
//   BLOG_EMBEDDING_MODEL    = opcional (override do modelo padrao)
//
// Se nao estiver configurado, getEmbeddingProvider() devolve null e a Camada 2
// fica inerte — a Camada 1 (lexical, pg_trgm) funciona sem nenhuma chave.
// ============================================================

import { EMBEDDING_DIM } from "@shared/schema";

// "document" para indexar o corpus; "query" para o candidato que comparamos.
export type InputType = "document" | "query";

export interface EmbeddingProvider {
  name: string;
  model: string;
  dim: number;
  embed(texts: string[], inputType: InputType): Promise<number[][]>;
}

// --- Voyage (recomendado): multilingue, 1024 dims (voyage-3). ---
function voyageProvider(apiKey: string, model: string): EmbeddingProvider {
  return {
    name: "voyage",
    model,
    dim: EMBEDDING_DIM,
    async embed(texts, inputType) {
      const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: texts,
          model,
          input_type: inputType,
          output_dimension: EMBEDDING_DIM,
        }),
      });
      if (!resp.ok) {
        throw new Error(`Voyage embeddings ${resp.status}: ${await resp.text()}`);
      }
      const json = (await resp.json()) as { data: { embedding: number[]; index: number }[] };
      // Reordena por index para casar com a ordem de entrada.
      return json.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    },
  };
}

// --- OpenAI (alternativa): text-embedding-3-small com dimensions=1024. ---
function openaiProvider(apiKey: string, model: string): EmbeddingProvider {
  return {
    name: "openai",
    model,
    dim: EMBEDDING_DIM,
    async embed(texts) {
      const resp = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: texts, model, dimensions: EMBEDDING_DIM }),
      });
      if (!resp.ok) {
        throw new Error(`OpenAI embeddings ${resp.status}: ${await resp.text()}`);
      }
      const json = (await resp.json()) as { data: { embedding: number[]; index: number }[] };
      return json.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    },
  };
}

let cached: EmbeddingProvider | null | undefined;

// Devolve o provider configurado, ou null se nao houver (Camada 2 desligada).
export function getEmbeddingProvider(): EmbeddingProvider | null {
  if (cached !== undefined) return cached;
  const provider = (process.env.BLOG_EMBEDDING_PROVIDER || "").toLowerCase();
  const apiKey = process.env.BLOG_EMBEDDING_API_KEY || "";
  if (!provider || !apiKey) {
    cached = null;
    return cached;
  }
  if (provider === "voyage") {
    cached = voyageProvider(apiKey, process.env.BLOG_EMBEDDING_MODEL || "voyage-3");
  } else if (provider === "openai") {
    cached = openaiProvider(apiKey, process.env.BLOG_EMBEDDING_MODEL || "text-embedding-3-small");
  } else {
    throw new Error(`BLOG_EMBEDDING_PROVIDER desconhecido: ${provider} (use "voyage" ou "openai").`);
  }
  return cached;
}

// Similaridade de cosseno entre dois vetores (assume mesma dimensao).
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Embeda um unico texto; devolve null quando a Camada 2 esta desligada.
export async function embedText(text: string, inputType: InputType): Promise<number[] | null> {
  const provider = getEmbeddingProvider();
  if (!provider) return null;
  const [vec] = await provider.embed([text], inputType);
  return vec ?? null;
}
