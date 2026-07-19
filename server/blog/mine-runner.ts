// ============================================================
// Runner de mineracao (Fase 0). Expande cada semente de um eixo em termos de
// consulta (conceito base + sigla + sinonimos em ingles), minera pt-BR (+en) no
// Autocomplete, agrega/deduplica/pontua e filtra o ruido. PURO em relacao ao
// banco: devolve os clusters minerados; quem grava e keyword-queue.ts.
// ============================================================

import type { Eixo, Seed } from "@shared/blog/seeds";
import { minerarTermo, type Lang, type SugestaoMinerada } from "./keyword-research";
import { isRelevante } from "./keyword-filter";

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Expande uma semente nos termos que serao efetivamente minerados.
export function termosDaSemente(seed: Seed, langs: Lang[]): { term: string; lang: Lang }[] {
  const out: { term: string; lang: Lang }[] = [];
  const paren = seed.conceito.match(/\(([^)]+)\)/);
  const base = seed.conceito
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (langs.includes("pt")) {
    out.push({ term: base, lang: "pt" });
    // Sigla curta e util (AFE, IVC, KMO, AFC, MEE...) tambem e minerada em pt.
    if (paren) {
      const acr = paren[1].trim();
      if (/^[A-Za-z0-9.-]{2,10}$/.test(acr)) out.push({ term: acr, lang: "pt" });
    }
  }
  if (langs.includes("en")) {
    for (const t of seed.termosEn ?? []) out.push({ term: t, lang: "en" });
  }
  return out;
}

export interface ClusterMinerado {
  subcategoria: string; // = seed.conceito
  priority: number;
  sugestoes: SugestaoMinerada[]; // ja filtradas e ordenadas por score
}

// Minera um eixo inteiro, cluster por cluster (semente por semente).
export async function minerarEixo(
  eixo: Eixo,
  langs: Lang[] = ["pt", "en"],
  opts: { delayMs?: number } = {},
): Promise<ClusterMinerado[]> {
  const { delayMs = 200 } = opts;
  const clusters: ClusterMinerado[] = [];

  for (const seed of eixo.sementes) {
    const porNorm = new Map<string, SugestaoMinerada>();
    for (const { term, lang } of termosDaSemente(seed, langs)) {
      const sugestoes = await minerarTermo(term, lang, { delayMs });
      for (const s of sugestoes) {
        const existente = porNorm.get(s.queryNormalized);
        if (existente) existente.score += s.score;
        else porNorm.set(s.queryNormalized, { ...s });
      }
      if (delayMs > 0) await dormir(delayMs);
    }
    const sugestoes = Array.from(porNorm.values())
      .filter((s) => isRelevante(s.query))
      .sort((a, b) => b.score - a.score);
    clusters.push({ subcategoria: seed.conceito, priority: seed.priority, sugestoes });
  }

  return clusters;
}
