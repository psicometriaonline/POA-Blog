// ============================================================
// Bancos de sementes por eixo (Fase 0) — base do minerador e, ao mesmo tempo,
// a estrategia editorial de leads. Derivado de SEMENTES-E-ESTRATEGIA-PSICOMETRIA.
//
// Piloto (decisao do dono): Eixo 3 (Psicometria e validacao) + Eixo 4 (Analise
// fatorial e MEE). Cada eixo mapeia para uma CATEGORIA ja existente do CMS e
// puxa um CURSO-ALVO da Academy (CTA ao final do post).
//
// Isto e DADO, nao enum fechado (Secao 5.1): as listas crescem para sempre sem
// migracao. O campo `macro` da fila = eixo.macro; `subcategoria` = seed.conceito.
// ============================================================

export interface Seed {
  // Conceito/grupo de analise. Vira o cluster (subcategoria) na fila.
  conceito: string;
  // Curadoria editorial (Secao 5.3): quanto mais perto do curso que converte,
  // maior. Ordena a fila com desempate por score de demanda. 3=nucleo do curso,
  // 2=importante, 1=cauda longa/nicho.
  priority: number;
  // Sinonimos em ingles com busca forte no nicho (Secao 5.4/7). Usados na
  // mineracao en; escrevemos sempre em portugues, com o termo en como keyword.
  termosEn?: string[];
}

export interface Eixo {
  // Nome do eixo. Vira o campo `macro` da fila e a pillar page.
  macro: string;
  // Categoria ja existente no CMS (slug em server/seed.ts) para onde o post vai.
  categorySlug: string;
  // Formacao da Academy que o cluster alimenta (CTA ao final do post).
  cursoAlvo: string;
  // Texto de abertura da pillar page (o que o eixo cobre, para quem).
  pillarIntro: string;
  sementes: Seed[];
}

// Modificadores de intencao (Secao 4): padroes reais deste publico academico.
// O minerador combina cada semente com estes para revelar a cauda longa.
export const MODIFICADORES = {
  conceituais: [
    "o que e",
    "para que serve",
    "quando usar",
    "quando nao usar",
    "diferenca entre",
    "vantagens e desvantagens de",
    "pressupostos de",
  ],
  execucaoR: ["como fazer no R", "no R passo a passo", "como rodar no R", "no R"],
  // Altissima intencao neste nicho: interpretar e reportar.
  interpretacao: [
    "como interpretar",
    "como reportar",
    "como descrever os resultados",
    "como reportar no artigo",
    "tabela de resultados de",
  ],
  planejamento: ["tamanho amostral para", "calculo amostral", "poder estatistico de"],
} as const;

export const EIXOS_PILOTO: Eixo[] = [
  {
    macro: "Psicometria e validacao de instrumentos",
    categorySlug: "psicometria",
    cursoAlvo: "Construcao, Adaptacao e Validacao de Instrumentos",
    pillarIntro:
      "Construir e validar um instrumento de medida e o coracao da psicometria aplicada. " +
      "Este eixo reune o passo a passo das evidencias de validade (conteudo, estrutura interna, " +
      "criterio e relacao com outras variaveis) e da confiabilidade, com foco em como calcular, " +
      "interpretar e reportar cada indicador em pesquisa com humanos.",
    sementes: [
      { conceito: "construcao de itens", priority: 2 },
      { conceito: "indice de validade de conteudo (IVC)", priority: 3, termosEn: ["content validity index"] },
      { conceito: "razao de validade de conteudo (CVR)", priority: 3, termosEn: ["content validity ratio"] },
      { conceito: "coeficiente de validade de conteudo (CVC)", priority: 3 },
      { conceito: "adaptacao transcultural", priority: 3, termosEn: ["cross-cultural adaptation"] },
      { conceito: "traducao e retrotraducao", priority: 2, termosEn: ["back-translation"] },
      { conceito: "evidencias de validade de conteudo", priority: 3, termosEn: ["content validity evidence"] },
      { conceito: "validade baseada na estrutura interna", priority: 3, termosEn: ["internal structure validity"] },
      { conceito: "consistencia interna", priority: 3, termosEn: ["internal consistency"] },
      { conceito: "confiabilidade teste-reteste", priority: 2, termosEn: ["test-retest reliability"] },
      { conceito: "validade convergente", priority: 3, termosEn: ["convergent validity"] },
      { conceito: "validade discriminante", priority: 3, termosEn: ["discriminant validity"] },
      { conceito: "validade de criterio", priority: 2, termosEn: ["criterion validity"] },
      { conceito: "alfa de Cronbach", priority: 3, termosEn: ["cronbach alpha", "cronbach's alpha"] },
      { conceito: "omega de McDonald", priority: 3, termosEn: ["mcdonald omega", "mcdonald's omega"] },
    ],
  },
  {
    macro: "Analise fatorial e Modelagem por Equacoes Estruturais",
    categorySlug: "analise-fatorial",
    cursoAlvo: "Analise Fatorial Exploratoria e Confirmatoria",
    pillarIntro:
      "Da estrutura latente de um teste a um modelo teorico completo: este eixo cobre a analise " +
      "fatorial exploratoria (AFE), a confirmatoria (AFC) e a modelagem por equacoes estruturais " +
      "(MEE), com enfase em decidir o numero de fatores, avaliar o ajuste do modelo, testar " +
      "invariancia de medida e interpretar e reportar cada resultado em R.",
    sementes: [
      { conceito: "analise fatorial exploratoria (AFE)", priority: 3, termosEn: ["exploratory factor analysis"] },
      { conceito: "AFE vs analise de componentes principais (ACP)", priority: 3, termosEn: ["EFA vs PCA"] },
      { conceito: "fatorabilidade", priority: 2, termosEn: ["factorability"] },
      { conceito: "KMO", priority: 2, termosEn: ["KMO", "Kaiser-Meyer-Olkin"] },
      { conceito: "esfericidade de Bartlett", priority: 2, termosEn: ["Bartlett sphericity"] },
      { conceito: "analise paralela", priority: 3, termosEn: ["parallel analysis"] },
      { conceito: "rotacao de fatores", priority: 2, termosEn: ["factor rotation", "oblique rotation"] },
      { conceito: "carga fatorial", priority: 3, termosEn: ["factor loading"] },
      { conceito: "variancia explicada", priority: 2, termosEn: ["explained variance"] },
      { conceito: "escores fatoriais", priority: 2, termosEn: ["factor scores"] },
      { conceito: "analise fatorial confirmatoria (AFC)", priority: 3, termosEn: ["confirmatory factor analysis"] },
      { conceito: "indices de ajuste (CFI, TLI, RMSEA, SRMR)", priority: 3, termosEn: ["model fit indices", "CFI TLI RMSEA SRMR"] },
      { conceito: "indices de modificacao", priority: 2, termosEn: ["modification indices"] },
      { conceito: "AFC bifactor", priority: 1, termosEn: ["bifactor model"] },
      { conceito: "fidedignidade composta", priority: 3, termosEn: ["composite reliability"] },
      { conceito: "invariancia de medida", priority: 3, termosEn: ["measurement invariance"] },
      { conceito: "AFC multigrupo", priority: 2, termosEn: ["multigroup CFA"] },
      { conceito: "modelo de mensuracao", priority: 2, termosEn: ["measurement model"] },
      { conceito: "MEE completa", priority: 3, termosEn: ["structural equation modeling", "SEM"] },
      { conceito: "mediacao latente", priority: 2, termosEn: ["latent mediation"] },
      { conceito: "moderacao latente", priority: 1, termosEn: ["latent moderation"] },
      { conceito: "efeito indireto", priority: 2, termosEn: ["indirect effect"] },
      { conceito: "bootstrapping na MEE", priority: 1, termosEn: ["bootstrapping SEM"] },
    ],
  },
];

// Busca o eixo (macro) pelo nome. Util para o gerador e a pillar page.
export function eixoPorMacro(macro: string): Eixo | undefined {
  return EIXOS_PILOTO.find((e) => e.macro === macro);
}

// Nomes dos eixos-piloto (usado pelo runner de mineracao).
export const MACRO_NOMES: string[] = EIXOS_PILOTO.map((e) => e.macro);
