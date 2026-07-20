// ============================================================
// Gerador e revisor de posts (Fase 1) — dominio de Psicometria/Estatistica.
//
// Fluxo: esboco (H1 + objetivo + H2 do cluster) -> expansao (aula escrita, com
// exemplo em R e "Perguntas frequentes") -> revisor independente (Opus 4.8) que
// reprova na menor duvida -> correcao guiada (ate 2 rodadas). As citacoes sao
// verificadas por DOI num passo deterministico a parte (citations.ts).
//
// Regras editoriais/revisor: PROMPTS.md B/C, adaptadas ao recorte academico.
// ============================================================

import type { Eixo } from "@shared/blog/seeds";
import {
  chamarLLMJson,
  MODEL_ESCRITOR,
  MODEL_REVISOR,
} from "./llm";

export interface BlogSection {
  heading?: string;
  paragraphs: string[];
}

export interface GeneratedPost {
  title: string;
  subtitle: string;
  excerpt: string;
  subcategoria: string | null;
  keywords: string[];
  body: BlogSection[]; // 1o item = introducao (sem heading); penultima = "Perguntas frequentes"
  referencias: string[];
  ctaCurso: string;
}

export interface Esboco {
  objetivo: string;
  h1: string;
  subtitulo: string;
  h2: string[];
  cursoAlvo: string;
}

export interface ChecagemTecnica {
  trecho: string;
  correto: boolean;
  observacao: string;
}

export interface VerificationResult {
  aprovado: boolean;
  motivos: string[];
  checagens: ChecagemTecnica[];
}

// ------------------------------------------------------------------
// System prompt do ESCRITOR (PROMPTS.md B, adaptado).
// ------------------------------------------------------------------
const EDITORIAL_RULES = `Voce e um redator tecnico especializado em Psicometria, Estatistica e Analise de Dados para pesquisa academica, escrevendo para o blog da Psicometria Online Academy. Seu publico e academico: mestrandos, doutorandos, pesquisadores e profissionais que fazem pesquisa quantitativa em ciencias humanas, sociais e da saude. Escreva sempre em portugues do Brasil.

Este texto sera conferido por um revisor tecnico rigoroso e por uma verificacao automatica de citacoes antes de publicar. Escreva desde ja no padrao que passa nesses filtros: conteudo correto, profundo, didatico e com citacoes reais.

ESCOPO
- DENTRO: pesquisa quantitativa em ciencias humanas, sociais e da saude (psicometria, validacao de instrumentos, estatistica aplicada, R para pesquisa, modelos mistos/multinivel, TRI/Rasch, MEE, redes, revisoes e metanalise, epidemiologia/saude coletiva, analise textual academica, ML aplicado a pesquisa).
- FORA: engenharia, financas/negocios, data science de mercado, desenvolvimento de software, big data. Se o tema puxar para fora do recorte academico, mantenha o enquadramento de pesquisa ou nao escreva.

CODIGO E FERRAMENTAS
- Todo codigo/script e em R. NUNCA Python. Nunca mencione Python nem "data science" de mercado.
- Nao prescreva um pacote fixo: foque no procedimento (grupo de analise). Se mostrar codigo, use funcoes e sintaxe R reais e validas, sem inventar funcao; se citar um pacote, apresente-o como uma opcao comum, nao como a unica.
- Ferramentas de interface que o publico usa (JASP, SPSS, jamovi, FACTOR, Winsteps, Mplus, IRAMUTEQ) podem ser citadas em nivel conceitual; scripts, so em R.

PROFUNDIDADE E DIDATICA (o diferencial deste blog)
- Sem limite de tamanho. O post e uma "aula escrita": o leitor deve terminar com dominio real do tema. Densidade, nao enchimento; cada paragrafo ensina algo novo.
- Escreva a partir de um objetivo de aprendizagem claro.
- Intuicao antes do formalismo: explique a ideia em linguagem acessivel (e, quando ajudar, uma analogia sobria) antes de formulas e jargao. Explique todo termo tecnico no primeiro uso.
- Encadeamento condutor: cada secao puxa a proxima de forma explicita, sem saltos; leve o leitor do zero ao dominio.
- Exemplo passo a passo obrigatorio e realista, de pesquisa em humanas/sociais/saude: dados de exemplo -> analise em R -> saida -> interpretacao de cada resultado. Mostre como se LE o resultado, nao so como se roda.
- Dedique espaco a "como interpretar" e "como reportar no artigo" (com uma frase-modelo pronta para o manuscrito).
- Inclua pressupostos, verificacoes, erros comuns e alternativas.
- Encerre o corpo com uma sintese ("o que levar deste post") e uma secao final com heading exatamente "Perguntas frequentes" (3 a 4 perguntas, respostas de 1 a 2 frases).

REGISTRO E ESTILO
- ATENCAO, IDIOMA: escreva o post em portugues do Brasil com acentuacao e ortografia CORRETAS e completas (ex.: "é", "ção", "análise", "conteúdo", "razão", "estatística"). Estas instrucoes estao propositalmente sem acentos, mas o TEXTO DO POST (titulo, subtitulo, corpo, FAQ, referencias) DEVE usar acentuacao normal do portugues. Um post sem acentos e inaceitavel.
- Academico e preciso, porem acessivel: nem coloquial/infantil, nem arido como paper de exatas. Terminologia correta, frases claras, tom de quem ensina.
- PROIBIDO (evita "cara de IA"): travessao (—); reframing "nao e X, e Y"; contagem dramatica "Nao X. Nao Y. Apenas Z."; falso espectro "de X a Y" sem escala real; pergunta retorica respondida na frase seguinte; anafora repetitiva; fragmentos curtissimos de enfase; encerrar frase com participio vazio ("-ndo").

VERACIDADE
- Correcao tecnica e inegociavel. So afirme formula, ponto de corte, pressuposto ou interpretacao com alta confianca; na menor duvida, generalize (descreva o funcionamento sem cravar um numero discutivel). Nunca invente dado numerico.
- Numeros em exemplos didaticos sao permitidos SE rotulados como exemplo ("suponha que a saida seja..."). Nao os apresente como dados de um estudo real.
- Nao trate heuristicas como leis (ex.: o corte 0,70 e orientacao, nao criterio absoluto).

CITACOES
- Voce PODE e DEVE citar em assercoes relevantes (resultados metodologicos consolidados), no formato autor-ano. Cite apenas obras REAIS e consolidadas que voce conhece com alta confianca. NUNCA invente autor, ano, titulo, periodico ou DOI. Na duvida sobre a existencia, nao cite: descreva a assercao como conhecimento estabelecido, sem atribuicao.
- Toda citacao sera resolvida automaticamente contra Crossref/OpenAlex antes de publicar; as nao confirmadas serao removidas. Prefira referencias canonicas e amplamente conhecidas.
- Liste as referencias citadas ao final, em formato autor, ano, titulo, veiculo.

FORMATO DE SAIDA
- Responda APENAS com JSON valido, no formato pedido pelo chamador. O primeiro item do corpo e a introducao e NAO tem heading.`;

// ------------------------------------------------------------------
// System prompt do REVISOR (PROMPTS.md C).
// ------------------------------------------------------------------
const REVIEWER_RULES = `Voce e um revisor tecnico independente e rigoroso do blog da Psicometria Online Academy. Sua funcao NAO e escrever nem melhorar o texto, e sim decidir se ele pode avancar (para rascunho ou publicacao). Voce e o ultimo filtro de qualidade. Aja com ceticismo profissional: na menor duvida tecnica, reprove.

O QUE VERIFICAR
1. CORRECAO ESTATISTICA/PSICOMETRICA (prioridade maxima). Identifique CADA afirmacao tecnica objetiva do texto: definicoes, formulas, pressupostos, pontos de corte, interpretacoes de p-valor/IC/tamanho de efeito, procedimentos e nomes de funcoes em R. Para cada uma, decida se esta correta conforme o conhecimento consolidado. Se estiver errada, desatualizada, ou se voce nao puder confirmar, marque como incorreta. Uma unica incorreta reprova o post.
2. CODIGO EM R. Deve ser R, nunca Python, com funcoes reais e sintaxe valida. Reprove se houver Python, funcao inventada ou codigo claramente incorreto.
3. ESCOPO. Reprove se o conteudo sair do recorte academico de humanas/sociais/saude (ex.: engenharia, mercado, industria).
4. CITACOES. Liste TODAS as citacoes do texto (autor, ano, titulo, veiculo). Elas serao resolvidas por DOI numa etapa automatica; sua funcao e lista-las com precisao e sinalizar as suspeitas/incompletas.
5. PROFUNDIDADE E DIDATICA. O texto precisa ensinar de fato: objetivo claro, encadeamento sem saltos, exemplo passo a passo com interpretacao, e consolidacao. Reprove conteudo superficial, generico ou com lacunas de raciocinio.
6. ESTILO. Reprove travessao (—) e os demais padroes proibidos; termo tecnico usado sem explicacao; promessa de resultado.
7. IDIOMA. O texto deve estar em portugues do Brasil com acentuacao e ortografia corretas. Reprove IMEDIATAMENTE se o texto estiver sem acentos (ex.: "e" no lugar de "é", "razao" no lugar de "razão", "conteudo" no lugar de "conteúdo").

DECISAO
- "aprovado": true SOMENTE se todas as afirmacoes tecnicas estiverem corretas, o codigo valido, o escopo respeitado, sem citacao suspeita pendente, com profundidade adequada e sem violacao de estilo.
- Em "motivos", liste objetivamente cada razao de reprovacao (vazio se aprovado).
- Em "checagens", liste cada afirmacao tecnica avaliada (trecho, correto?, observacao).
- Responda APENAS com JSON valido no formato pedido pelo chamador.`;

const stripDash = (s: string) => s.replace(/—/g, "-").trim();

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Monta o HTML do corpo a partir das secoes (o editor do CMS usa HTML).
export function sectionsToHtml(body: BlogSection[]): string {
  const parts: string[] = [];
  for (const section of body) {
    if (section.heading) parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    for (const p of section.paragraphs) parts.push(`<p>${escapeHtml(p)}</p>`);
  }
  return parts.join("\n");
}

// Extrai a secao "Perguntas frequentes" como pares {question, answer} (para a
// coluna faq do post, que alimenta o FAQPage JSON-LD do CMS).
export function extrairFaq(body: BlogSection[]): { question: string; answer: string }[] {
  const sec = body.find((s) => (s.heading ?? "").toLowerCase().includes("perguntas frequentes"));
  if (!sec) return [];
  const faq: { question: string; answer: string }[] = [];
  const ps = sec.paragraphs;
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].trim().endsWith("?")) {
      const answer = ps[i + 1] && !ps[i + 1].trim().endsWith("?") ? ps[i + 1].trim() : "";
      faq.push({ question: ps[i].trim(), answer });
      if (answer) i++;
    }
  }
  return faq;
}

// Valida e normaliza o JSON do post devolvido pela IA (remove travessao etc.).
function buildGeneratedPost(parsed: Partial<GeneratedPost>, sub: string | null): GeneratedPost {
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.subtitle !== "string" ||
    typeof parsed.excerpt !== "string" ||
    !Array.isArray(parsed.keywords) ||
    !Array.isArray(parsed.body)
  ) {
    throw new Error("Resposta da IA em formato inesperado para o post.");
  }
  const body: BlogSection[] = parsed.body
    .filter((s): s is BlogSection => !!s && Array.isArray((s as BlogSection).paragraphs))
    .map((s) => ({
      heading: s.heading ? stripDash(s.heading) : undefined,
      paragraphs: s.paragraphs.filter((p): p is string => typeof p === "string").map(stripDash).filter(Boolean),
    }))
    .filter((s) => s.paragraphs.length > 0);
  if (body.length === 0) throw new Error("A IA nao retornou o corpo do post.");

  // Barreira deterministica de idioma: um post longo em portugues sem NENHUM
  // caractere acentuado e impossivel — indica que a IA escreveu sem acentos.
  const textoTodo = body.map((s) => `${s.heading ?? ""} ${s.paragraphs.join(" ")}`).join(" ");
  if (textoTodo.length > 1000 && !/[áéíóúâêôãõçàüÁÉÍÓÚÂÊÔÃÕÇ]/.test(textoTodo)) {
    throw new Error("Post gerado sem acentuacao (portugues invalido). Geracao rejeitada.");
  }

  return {
    title: stripDash(parsed.title).slice(0, 120),
    subtitle: stripDash(parsed.subtitle),
    excerpt: stripDash(parsed.excerpt),
    subcategoria: sub,
    keywords: parsed.keywords.filter((k): k is string => typeof k === "string").map(stripDash).filter(Boolean).slice(0, 6),
    body,
    referencias: Array.isArray(parsed.referencias)
      ? parsed.referencias.filter((r): r is string => typeof r === "string").map((r) => r.trim()).filter(Boolean)
      : [],
    ctaCurso: typeof parsed.ctaCurso === "string" ? stripDash(parsed.ctaCurso) : "",
  };
}

// ------------------------------------------------------------------
// Passo 1: ESBOCO (PROMPTS.md D.1)
// ------------------------------------------------------------------
export async function gerarEsboco(
  eixo: Eixo,
  targetQuery: string,
  perguntasRelacionadas: string[],
): Promise<Esboco> {
  const lista =
    perguntasRelacionadas.length > 0
      ? perguntasRelacionadas.map((q) => `- ${q}`).join("\n")
      : "(nenhuma; proponha H2 pertinentes e corretos sobre o tema.)";
  const user = `Gere o ESBOCO de um post para o eixo "${eixo.macro}", ancorado numa BUSCA REAL do Google: "${targetQuery}".

Perguntas relacionadas (do mesmo cluster, use as pertinentes como H2 e na secao de Perguntas frequentes):
${lista}

Defina, seguindo a estrutura didatica (gancho -> intuicao -> metodo -> exemplo em R -> interpretacao -> pressupostos -> quando usar -> como reportar -> sintese/FAQ):
- o objetivo de aprendizagem;
- o H1 (responde a busca, corrige acentuacao/ortografia, no maximo 70 caracteres, em portugues);
- o subtitulo (uma frase);
- a lista ordenada de H2 (terminando em "Perguntas frequentes");
- o curso-alvo do CTA (sugestao: "${eixo.cursoAlvo}").

Responda APENAS em JSON: {"objetivo":"...","h1":"...","subtitulo":"...","h2":["...","..."],"cursoAlvo":"..."}.`;

  const p = (await chamarLLMJson({
    model: MODEL_ESCRITOR,
    system: EDITORIAL_RULES,
    user,
    maxTokens: 2000,
    effort: "medium",
  })) as Partial<Esboco>;
  if (!p || typeof p.h1 !== "string" || !Array.isArray(p.h2)) {
    throw new Error("Esboco em formato inesperado.");
  }
  return {
    objetivo: stripDash(String(p.objetivo ?? "")),
    h1: stripDash(p.h1).slice(0, 90),
    subtitulo: stripDash(String(p.subtitulo ?? "")),
    h2: p.h2.filter((h): h is string => typeof h === "string").map(stripDash),
    cursoAlvo: stripDash(String(p.cursoAlvo ?? eixo.cursoAlvo)),
  };
}

// ------------------------------------------------------------------
// Passo 2: EXPANSAO (PROMPTS.md D.2)
// ------------------------------------------------------------------
export async function expandirPost(
  eixo: Eixo,
  esboco: Esboco,
  targetQuery: string,
  perguntasRelacionadas: string[],
  subcategoria: string | null,
): Promise<GeneratedPost> {
  const lista =
    perguntasRelacionadas.length > 0 ? perguntasRelacionadas.map((q) => `- ${q}`).join("\n") : "(nenhuma)";
  const user = `Escreva o post COMPLETO seguindo o esboco abaixo e TODAS as regras editoriais. Expanda cada H2 com profundidade (aula escrita, sem limite de tamanho), incluindo o exemplo passo a passo em R com interpretacao de cada resultado, a secao "Perguntas frequentes" e as referencias. Cite apenas obras reais (serao verificadas por DOI).

Este post responde a busca real: "${targetQuery}".
Perguntas do cluster (para H2 e FAQ):
${lista}

ESBOCO: ${JSON.stringify(esboco)}

Responda APENAS em JSON, exatamente neste formato:
{
  "title": "H1, max. 70 caracteres",
  "subtitle": "subtitulo de uma frase",
  "excerpt": "resumo de 1 a 2 frases para o card",
  "subcategoria": "${subcategoria ?? ""}",
  "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"],
  "body": [
    { "paragraphs": ["introducao 1", "introducao 2"] },
    { "heading": "H2...", "paragraphs": ["...", "..."] },
    { "heading": "Perguntas frequentes", "paragraphs": ["Pergunta 1?", "Resposta 1.", "..."] }
  ],
  "referencias": ["Autor, A. (ano). Titulo. Veiculo.", "..."],
  "ctaCurso": "${esboco.cursoAlvo}"
}
O primeiro item de "body" e a introducao e NAO tem heading. A penultima secao e "Perguntas frequentes". Nao inclua o disclaimer nem o CTA no corpo; sao adicionados pelo sistema.`;

  const parsed = await chamarLLMJson({
    model: MODEL_ESCRITOR,
    system: EDITORIAL_RULES,
    user,
    maxTokens: 16000,
    effort: "high",
  });
  return buildGeneratedPost(parsed as Partial<GeneratedPost>, subcategoria);
}

// ------------------------------------------------------------------
// Revisor (PROMPTS.md C) + barreira deterministica.
// ------------------------------------------------------------------
function postParaTexto(post: GeneratedPost): string {
  const linhas: string[] = [`TITULO: ${post.title}`, `SUBTITULO: ${post.subtitle}`, `RESUMO: ${post.excerpt}`, ""];
  for (const s of post.body) {
    if (s.heading) linhas.push(`## ${s.heading}`);
    for (const p of s.paragraphs) linhas.push(p);
    linhas.push("");
  }
  if (post.referencias.length) linhas.push("REFERENCIAS:", ...post.referencias);
  return linhas.join("\n");
}

// Marcadores de que o texto faz afirmacao tecnica concreta (corte numerico,
// p-valor, funcao R, citacao autor-ano). Se ha algum e o revisor devolveu ZERO
// checagens, reprovamos ("na duvida, reprova").
const PADROES_TECNICOS: RegExp[] = [
  /[<>]=?\s*0[.,]\d/, // pontos de corte (> 0,70)
  /\bp\s*[<>=]/i, // p-valor
  /\b(alfa|omega|cronbach|rmsea|cfi|tli|srmr|kmo)\b/i,
  /\b\w+\s*\([^)]*\)/, // chamada de funcao R
  /\(\s*(18|19|20)\d{2}\s*\)/, // citacao (ano)
];
function contemAfirmacaoTecnica(post: GeneratedPost): boolean {
  const texto = postParaTexto(post);
  return PADROES_TECNICOS.some((re) => re.test(texto));
}

export async function revisarPost(
  eixo: Eixo,
  targetQuery: string,
  post: GeneratedPost,
): Promise<VerificationResult> {
  const user = `Revise o post abaixo (eixo "${eixo.macro}", ancorado na busca "${targetQuery}") e decida se pode avancar.

TEXTO DO POST:
"""
${postParaTexto(post)}
"""

Responda APENAS com JSON valido, exatamente neste formato:
{
  "aprovado": true,
  "motivos": ["motivo da reprovacao 1", "..."],
  "checagens": [
    { "trecho": "afirmacao tecnica exata", "correto": true, "observacao": "por que esta correta ou incorreta" }
  ]
}`;

  const parsed = (await chamarLLMJson({
    model: MODEL_REVISOR,
    system: REVIEWER_RULES,
    user,
    maxTokens: 16000,
    effort: "high",
    thinking: true,
  })) as { aprovado?: unknown; motivos?: unknown; checagens?: unknown };
  if (!parsed || typeof parsed.aprovado !== "boolean") {
    throw new Error("Resposta da IA em formato inesperado para a verificacao.");
  }
  const motivos = Array.isArray(parsed.motivos)
    ? parsed.motivos.filter((m): m is string => typeof m === "string")
    : [];
  const checagens: ChecagemTecnica[] = Array.isArray(parsed.checagens)
    ? parsed.checagens
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({
          trecho: typeof c.trecho === "string" ? c.trecho : "",
          correto: c.correto === true,
          observacao: typeof c.observacao === "string" ? c.observacao : "",
        }))
    : [];

  const algumIncorreto = checagens.some((c) => !c.correto);
  const faltaChecagem = checagens.length === 0 && contemAfirmacaoTecnica(post);
  const aprovado = parsed.aprovado === true && !algumIncorreto && !faltaChecagem;

  const motivosFinais = [...motivos];
  if (algumIncorreto && parsed.aprovado === true) {
    motivosFinais.push("Reprovado automaticamente: ha afirmacao tecnica marcada como incorreta na checagem.");
  }
  if (faltaChecagem) {
    motivosFinais.push("Reprovado automaticamente: o texto traz afirmacoes tecnicas, mas o revisor nao apresentou a checagem de cada uma.");
  }
  return { aprovado, motivos: motivosFinais, checagens };
}

// ------------------------------------------------------------------
// Correcao guiada (PROMPTS.md D.3)
// ------------------------------------------------------------------
export async function corrigirPost(
  eixo: Eixo,
  targetQuery: string,
  post: GeneratedPost,
  verificacao: VerificationResult,
): Promise<GeneratedPost> {
  const problemas: string[] = [...verificacao.motivos.map((m) => `- ${m}`)];
  for (const c of verificacao.checagens) {
    if (!c.correto) problemas.push(`- Corrigir: "${c.trecho}". Observacao do revisor: ${c.observacao}`);
  }
  const lista = problemas.length > 0 ? problemas.join("\n") : "- Reforce a correcao tecnica e a profundidade.";

  const atual = JSON.stringify({
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    subcategoria: post.subcategoria,
    keywords: post.keywords,
    body: post.body,
    referencias: post.referencias,
    ctaCurso: post.ctaCurso,
  });

  const user = `Voce escreveu o post abaixo (eixo "${eixo.macro}", busca "${targetQuery}"), mas o revisor apontou problemas que impedem a publicacao. Corrija resolvendo TODOS os problemas, mantendo tema, estrutura e o que passou.

REGRA DE CORRECAO (prioridade maxima): a acao PADRAO para dado tecnico apontado e GENERALIZAR (remover o valor especifico e descrever o funcionamento), nunca reafirmar. Para citacao suspeita: remover ou substituir por uma referencia real. Nunca inventar dado nem citacao. Nunca usar Python nem travessao.

POST ATUAL (JSON): ${atual}
PROBLEMAS APONTADOS: ${lista}

Responda APENAS com JSON no mesmo formato do post atual (title, subtitle, excerpt, subcategoria, keywords, body, referencias, ctaCurso). O primeiro item de "body" e a introducao e NAO tem heading.`;

  const parsedCorr = await chamarLLMJson({
    model: MODEL_ESCRITOR,
    system: EDITORIAL_RULES,
    user,
    maxTokens: 16000,
    effort: "high",
  });
  return buildGeneratedPost(parsedCorr as Partial<GeneratedPost>, post.subcategoria);
}
