// ============================================================
// Filtro de ruido REESCRITO para o dominio academico (Secao 5.5 do mapa).
//
// ATENCAO: o que era ruido nos sites de populacao geral e ALVO aqui. NAO cortamos
// pdf, artigo, tese, scielo, slides, termos em ingles nem nomes de software/pacote
// ("analise fatorial pdf", "lavaan tutorial", "SPSS download", "measurement
// invariance" sao buscas legitimas do publico). Tambem NAO cortamos por ano
// (R 4.3, SPSS 29, APA 7 importam).
//
// Cortamos so RUIDO DE VERDADE e o que sai da cerca de escopo (Secao 2):
// - outros idiomas que nao pt/en (espanhol solto);
// - entretenimento/pop e compras;
// - temas fora do recorte academico de humanas/sociais/saude (engenharia,
//   negocios/mercado, industria) e Python em qualquer forma;
// - sopa de letrinhas pura.
// A curadoria das sementes passa a ser o principal controle de qualidade.
// ============================================================

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Tokens isolados (fronteira de palavra) que denunciam ruido. NENHUM colide com
// o vocabulario do nicho (nao entram "modelo", "escala", "medida", "aplicada").
const TOKENS_BLOQUEADOS = new Set<string>([
  // Espanhol inequivoco (nao existe em portugues) — spillover do hl=pt-BR.
  "el", "los", "las", "del", "una", "uno", "hasta", "escuela", "mismo", "sus",
  "nino", "nina", "ninos", "trabajo", "empleo", "espanol", "significado",
  // Entretenimento / pop / mídia.
  "netflix", "serie", "novela", "filme", "elenco", "temporada", "temporadas",
  "episodio", "episodios", "gta", "anime", "musica", "cifra", "colorir",
  "desenho", "quiz", "wattpad", "roblox", "minecraft",
  // Compras / preco.
  "comprar", "preco", "barato", "promocao", "cupom", "frete",
  // Fora de escopo: mercado financeiro / negocios / engenharia / industria.
  // (Secao 2: descartar engenharia, financas/negocios, data science industrial.)
  "python",
  "acoes", "bolsa", "bitcoin", "cripto", "criptomoedas", "forex", "trading",
  "engenharia", "industria", "industrial", "marketing", "vendas",
]);

// Trechos (substring na versao normalizada) que denunciam ruido/off-topic.
const TRECHOS_BLOQUEADOS = [
  // Espanhol multi-palavra.
  "que es el", "que es la", "en espana", "en argentina", "en mexico",
  "en colombia", "en chile", "en peru", "para que sirve el",
  // Entretenimento.
  "quem matou", "novela das", "para colorir",
  // Fora de escopo (recorte academico de humanas/sociais/saude).
  "prever acoes", "mercado de acoes", "mercado financeiro", "day trade",
  "engenharia de materiais", "para negocios", "para empresas", "em python",
  "no python", "com python", "de mercado",
];

// Sopa de letrinhas / vazio (SEM cortar por ano — anos/versoes importam aqui).
const REGEX_LETRA_FINAL = /\s[a-z]$/; // sobra "invariancia w"
const REGEX_SO_LETRA = /^[a-z0-9 ]{0,4}$/; // curta demais / sem conteudo

// Decide se uma busca minerada e um bom tema para o blog.
export function isRelevante(query: string): boolean {
  return motivoIrrelevante(query) === null;
}

// Versao que tambem informa o motivo (para logs/depuracao do limpador).
export function motivoIrrelevante(query: string): string | null {
  const n = normalizar(query);
  if (!n || n.length < 8) return "curta demais";
  if (REGEX_LETRA_FINAL.test(n)) return "sobra de sopa de letrinhas";
  if (REGEX_SO_LETRA.test(n)) return "sem conteudo";
  for (const p of n.split(" ")) {
    if (TOKENS_BLOQUEADOS.has(p)) return `token bloqueado: ${p}`;
  }
  for (const trecho of TRECHOS_BLOQUEADOS) {
    if (n.includes(trecho)) return `trecho bloqueado: ${trecho}`;
  }
  return null;
}
