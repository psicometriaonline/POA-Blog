// ============================================================
// Minerador de palavras-chave via Google Autocomplete (Fase 0).
//
// Usa a API publica de sugestoes do Google (a mesma fonte do AnswerThePublic):
// gratuita, sem chave, legal (pedimos sugestoes como um navegador ao digitar).
// NAO fazemos scraping de SERP. Modulo PURO em relacao ao banco: so descobre e
// devolve sugestoes; quem grava na fila e keyword-queue.ts.
//
// Adaptacoes ao dominio academico (vs sites irmaos):
// - Modificadores de intencao do pesquisador (interpretar/reportar/rodar no R).
// - Bilingue pt-BR + en (Secao 5.4): dois passes por termo; guardamos `lang`.
// ============================================================

// Endpoint publico. client=firefox devolve JSON limpo [termo, [sug1, sug2, ...]].
const AUTOCOMPLETE_URL = "https://suggestqueries.google.com/complete/search";

export type Lang = "pt" | "en";

// Localidade do Autocomplete por idioma.
const LOCALE: Record<Lang, { hl: string; gl: string }> = {
  pt: { hl: "pt-BR", gl: "br" },
  en: { hl: "en", gl: "us" },
};

// Prefixos de intencao do pesquisador quantitativo (o que ele quer:
// entender, rodar, interpretar, reportar, planejar). Um por consulta.
const PREFIXOS: Record<Lang, string[]> = {
  pt: [
    "o que e",
    "o que significa",
    "para que serve",
    "como funciona",
    "como calcular",
    "como fazer",
    "como rodar",
    "como interpretar",
    "como reportar",
    "quando usar",
    "quando nao usar",
    "diferenca entre",
    "pressupostos de",
    "vantagens e desvantagens de",
    "tamanho amostral para",
    "exemplo de",
  ],
  en: [
    "what is",
    "how to calculate",
    "how to run",
    "how to interpret",
    "how to report",
    "how to test",
    "when to use",
    "assumptions of",
    "difference between",
    "example of",
  ],
};

const SUFIXOS: Record<Lang, string[]> = {
  pt: [
    "no r",
    "passo a passo",
    "como interpretar",
    "como reportar",
    "exemplo",
    "formula",
    "pressupostos",
    "vs",
  ],
  en: ["in r", "example", "interpretation", "formula", "assumptions", "vs", "cutoff"],
};

// Sopa de letrinhas: captura continuacoes populares fora dos prefixos/sufixos.
const ALFABETO = "abcdefghijklmnopqrstuvwxyz".split("");

// Aberturas tipicas de pergunta (classifica isQuestion). Perguntas viram H2 e
// alimentam o rich result de FAQ.
const INICIOS_DE_PERGUNTA: Record<Lang, string[]> = {
  pt: [
    "o que",
    "como",
    "quando",
    "quanto",
    "qual",
    "quais",
    "por que",
    "porque",
    "onde",
    "para que",
    "diferenca entre",
    "vale a pena",
    "devo",
    "posso",
    "preciso",
  ],
  en: [
    "what",
    "how",
    "when",
    "which",
    "why",
    "where",
    "is",
    "are",
    "does",
    "do",
    "can",
    "should",
    "difference between",
  ],
};

// Marcadores de intencao de pergunta (mesmo sem abertura interrogativa classica).
const MARCADORES_PERGUNTA =
  /\b(como interpretar|como reportar|para que serve|quando usar|quando nao usar|diferenca entre|pressupostos de|how to|what is|when to use|difference between|assumptions of)\b/;

export interface SugestaoMinerada {
  query: string;
  queryNormalized: string;
  isQuestion: boolean;
  score: number;
  lang: Lang;
}

export function normalizarQuery(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ehPergunta(query: string, lang: Lang): boolean {
  const n = normalizarQuery(query);
  if (query.includes("?")) return true;
  if (MARCADORES_PERGUNTA.test(n)) return true;
  return INICIOS_DE_PERGUNTA[lang].some((p) => n.startsWith(normalizarQuery(p)));
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Uma unica consulta ao Autocomplete. Resiliente: qualquer falha devolve [].
export async function fetchSuggestions(
  termo: string,
  lang: Lang,
  timeoutMs = 8000,
): Promise<string[]> {
  const { hl, gl } = LOCALE[lang];
  const url = `${AUTOCOMPLETE_URL}?client=firefox&hl=${encodeURIComponent(
    hl,
  )}&gl=${encodeURIComponent(gl)}&q=${encodeURIComponent(termo)}`;
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return [];
    const texto = await resp.text();
    const data = JSON.parse(texto) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return (data[1] as unknown[]).filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

// Monta as consultas-semente a partir de um termo base, no idioma dado.
function montarConsultas(termo: string, lang: Lang): string[] {
  const consultas = new Set<string>();
  consultas.add(termo);
  for (const p of PREFIXOS[lang]) consultas.add(`${p} ${termo}`);
  for (const s of SUFIXOS[lang]) consultas.add(`${termo} ${s}`);
  for (const l of ALFABETO) consultas.add(`${termo} ${l}`);
  return Array.from(consultas);
}

// Minera um unico termo (num idioma). Dispara as consultas derivadas, junta,
// deduplica e pontua. Sequencial com pausa curta (gentil com o Autocomplete).
export async function minerarTermo(
  termo: string,
  lang: Lang,
  opts: { delayMs?: number } = {},
): Promise<SugestaoMinerada[]> {
  const { delayMs = 200 } = opts;
  const consultas = montarConsultas(termo, lang);
  const termoNorm = normalizarQuery(termo);
  const tokenRaiz = termoNorm.split(" ")[0] ?? "";

  const acumulado = new Map<string, SugestaoMinerada>();

  for (const consulta of consultas) {
    const sugestoes = await fetchSuggestions(consulta, lang);
    sugestoes.forEach((sug, indice) => {
      const norm = normalizarQuery(sug);
      if (!norm || norm.length < 8) return;
      // Relevancia: a sugestao precisa conter a raiz do termo OU o termo inteiro.
      if (!norm.includes(tokenRaiz) && !norm.includes(termoNorm)) return;

      const bonusPosicao = Math.max(0, 10 - indice);
      const existente = acumulado.get(norm);
      if (existente) {
        existente.score += 1 + bonusPosicao;
      } else {
        acumulado.set(norm, {
          query: sug.trim(),
          queryNormalized: norm,
          isQuestion: ehPergunta(sug, lang),
          score: 1 + bonusPosicao,
          lang,
        });
      }
    });
    if (delayMs > 0) await dormir(delayMs);
  }

  // Remove o proprio termo cru (sem valor como tema) e ordena por score.
  acumulado.delete(termoNorm);
  return Array.from(acumulado.values()).sort((a, b) => b.score - a.score);
}
