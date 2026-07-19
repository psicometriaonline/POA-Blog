// ============================================================
// Filtro SEMANTICO contrastivo de ruido (complementa keyword-filter.ts).
//
// Problema: termos ambíguos ("CVC" = agencia de viagens, "construcao de
// itens" = Stardew/lojas, "omega McDonald" = Filet-O-Fish/shopping) passam
// pelo filtro lexical porque nao ha token proibido, e listas de bloqueio nao
// escalam para os "multiplos sentidos" de cada sigla.
//
// Solucao (usa o mesmo provider de embeddings da Camada 2): para cada
// sugestao calculamos
//   simDom    = max(similaridade com ancoras do DOMINIO + a semente do cluster)
//   simContra = max(similaridade com ancoras de RUIDO conhecido)
// e mantemos apenas se (simDom - simContra) >= corte. Ou seja: a sugestao
// precisa estar mais perto da psicometria do que de viagens/fast-food/jogos/
// empresas. Calibrado no eixo 1 (3.255 sugestoes): ruido fica com delta <= 0.05
// e o conteudo bom tem mediana ~0.43.
//
// Sem provider configurado o filtro fica inerte (devolve tudo), igual a
// Camada 2 da anti-canibalizacao.
//
// Ajuste fino: BLOG_SEMANTIC_MIN_DELTA (default abaixo).
// ============================================================

import { getEmbeddingProvider, cosineSim } from "./embeddings";
import type { SugestaoMinerada } from "./keyword-research";

// Ancoras do dominio (pt+en). Nao precisam ser exaustivas: definem a "regiao"
// do espaco semantico onde o blog vive.
const ANCORAS_DOMINIO = [
  "psicometria, validade e fidedignidade de testes e escalas psicologicas",
  "analise fatorial exploratoria e confirmatoria, cargas fatoriais, KMO",
  "coeficiente de validade de conteudo, indice de validade de conteudo, avaliacao por juizes especialistas",
  "construcao e validacao de itens de instrumentos de medida em pesquisa",
  "confiabilidade: alfa de Cronbach, omega de McDonald, consistencia interna",
  "como calcular o omega de McDonald e o alfa de Cronbach no SPSS, R, JASP ou Excel",
  "estatistica aplicada a pesquisa em psicologia, saude e ciencias sociais",
  "teoria de resposta ao item, teoria classica dos testes, escalas likert",
  "modelagem de equacoes estruturais, invariancia de medida, ajuste de modelo",
  "analise de dados quantitativos em R, SPSS, JASP e jamovi para pesquisa academica",
  "traducao, adaptacao transcultural e back translation (retrotraducao) de instrumentos e questionarios",
  "psychometrics, content validity, construct validity, reliability of psychological scales",
  "exploratory and confirmatory factor analysis, item response theory, structural equation modeling",
  "McDonald's omega and Cronbach's alpha internal consistency, what is a good omega value in research",
];

// Ancoras de RUIDO: os outros sentidos que o Autocomplete traz para as mesmas
// siglas/palavras. Adicionar aqui e mais robusto do que listar tokens.
const ANCORAS_CONTRA = [
  "agencia de viagens, pacotes de viagem, passagens aereas, cruzeiros, resorts e turismo",
  "fast food, cardapio, lanche, hamburguer, McDonald's menu, filet o fish sandwich, prices and calories",
  "video game, jogos, itens e construcao no Stardew Valley, The Sims, Minecraft, Terraria",
  "loja de material de construcao, reforma, obra, acabamento, tijolo e cimento",
  "empresa ltda, cnpj, telefone, endereco, filiais, vagas de emprego e lojas em shopping center",
  "compras online, promocao, cupom de desconto, produtos e precos",
  "cartao de credito, codigo de seguranca cvc cvv do cartao",
  "significado de palavras e frases em hindi, tamil, telugu, marathi, tagalog e outros idiomas",
];

// Corte minimo do delta (simDom - simContra), calibrado no eixo 1.
const MIN_DELTA_DEFAULT = 0.1;

// Resgate lexical na zona cinzenta (entre MIN_DELTA-0.05 e MIN_DELTA): se a
// sugestao contem um termo inequivoco do nicho (software estatistico, formula,
// citacao...), ela sobrevive. Ex.: "mcdonald's omega mplus" fica no limiar por
// causa do shopping Omega/McDonald's lanche, mas "mplus" nao deixa duvida.
const RESGATE_ZONA = 0.05;
const REGEX_RESGATE =
  /\b(mplus|spss|jasp|jamovi|lavaan|amos|stata|minitab|excel|calculator|calculadora|calcular|formula|f[óo]rmula|cita(?:tion|coes|ção|çoes)?|apa|reliab\w*|confiabilidade|fidedignidade|validade|validity|psicometr\w*|psychometr\w*|cronbach|likert|fatorial|factor(?:ial)? analysis|questionario|questionnaire|escala|scale|survey|instrumento|juizes|interpretar|interpretacao|report(?:ar|ing)?)\b/i;

function minDelta(): number {
  const v = Number(process.env.BLOG_SEMANTIC_MIN_DELTA);
  return Number.isFinite(v) && v > -1 && v < 1 ? v : MIN_DELTA_DEFAULT;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry com backoff para chamadas de embedding (rate limit/rede transitorios).
async function embedComRetry(
  provider: NonNullable<ReturnType<typeof getEmbeddingProvider>>,
  texts: string[],
  inputType: "document" | "query",
  tentativas = 3,
): Promise<number[][]> {
  let ultimoErro: unknown;
  for (let t = 0; t < tentativas; t++) {
    try {
      return await provider.embed(texts, inputType);
    } catch (err) {
      ultimoErro = err;
      if (t < tentativas - 1) await dormir(500 * 2 ** t + Math.random() * 250);
    }
  }
  throw ultimoErro;
}

let ancorasCache: { dom: number[][]; contra: number[][] } | null = null;

async function ancoras() {
  // Cacheia apenas SUCESSO (nunca uma Promise rejeitada): se falhar agora,
  // a proxima chamada tenta de novo.
  if (ancorasCache) return ancorasCache;
  const provider = getEmbeddingProvider();
  if (!provider) throw new Error("sem provider");
  const dom = await embedComRetry(provider, ANCORAS_DOMINIO, "document");
  const contra = await embedComRetry(provider, ANCORAS_CONTRA, "document");
  ancorasCache = { dom, contra };
  return ancorasCache;
}

export interface ResultadoSemantico {
  mantidas: SugestaoMinerada[];
  cortadas: { sugestao: SugestaoMinerada; delta: number }[];
  ativo: boolean; // false quando nao ha provider (filtro inerte)
}

// Filtra as sugestoes de UM cluster. `seedConceito` e o nome completo da
// semente (ex.: "coeficiente de validade de conteudo (CVC)"): sugestoes
// proximas da semente sobrevivem mesmo na borda do centroide do dominio.
export async function filtrarSemanticamente(
  sugestoes: SugestaoMinerada[],
  seedConceito: string,
): Promise<ResultadoSemantico> {
  const provider = getEmbeddingProvider();
  if (!provider || sugestoes.length === 0) {
    return { mantidas: sugestoes, cortadas: [], ativo: false };
  }

  // FAIL-OPEN: se o provider falhar mesmo apos retries, a mineracao continua
  // apenas com o filtro lexical (nao derruba a sessao inteira).
  try {
    const corte = minDelta();
    const { dom, contra } = await ancoras();
    const [seedVec] = await embedComRetry(
      provider,
      [`${seedConceito} em psicometria e analise de dados`],
      "document",
    );
    const domComSeed = [...dom, seedVec];

    const mantidas: SugestaoMinerada[] = [];
    const cortadas: { sugestao: SugestaoMinerada; delta: number }[] = [];

    const LOTE = 512;
    for (let i = 0; i < sugestoes.length; i += LOTE) {
      const fatia = sugestoes.slice(i, i + LOTE);
      const vecs = await embedComRetry(provider, fatia.map((s) => s.query), "query");
      for (let j = 0; j < fatia.length; j++) {
        const simDom = Math.max(...domComSeed.map((a) => cosineSim(vecs[j], a)));
        const simContra = Math.max(...contra.map((a) => cosineSim(vecs[j], a)));
        const delta = simDom - simContra;
        const resgatada =
          delta >= corte - RESGATE_ZONA && REGEX_RESGATE.test(fatia[j].query);
        if (delta >= corte || resgatada) mantidas.push(fatia[j]);
        else cortadas.push({ sugestao: fatia[j], delta });
      }
    }

    return { mantidas, cortadas, ativo: true };
  } catch (err) {
    console.warn(
      `[semantic-filter] provider de embeddings falhou (${(err as Error)?.message}); ` +
        `cluster "${seedConceito}" segue so com o filtro lexical.`,
    );
    return { mantidas: sugestoes, cortadas: [], ativo: false };
  }
}
