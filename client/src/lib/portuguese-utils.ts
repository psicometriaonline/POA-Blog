export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export function countWords(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(w => w.length > 0).length;
}

export function splitIntoSentences(text: string): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+/);
  return sentences.map(s => s.trim()).filter(s => s.length > 2);
}

export function extractSentencesFromHtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = doc.querySelectorAll("p, li");
  const allSentences: string[] = [];
  blocks.forEach(block => {
    const text = (block.textContent || "").trim();
    if (!text) return;
    const sentences = text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => s.length > 2);
    if (sentences.length > 0) {
      allSentences.push(...sentences);
    } else if (text.length > 2) {
      allSentences.push(text);
    }
  });
  return allSentences;
}

const PASSIVE_AUX = /\b(é|são|foi|foram|era|eram|será|serão|seria|seriam|seja|sejam|fosse|fossem|está|estão|estava|estavam|esteve|estiveram|ficou|ficaram|fica|ficam|ficava|ficavam|fora|forem|for|sendo|sido|ser|estar|ficar)\b/i;

const PARTICIPLE_PATTERN = /\b\w{3,}(ado|ada|ados|adas|ido|ida|idos|idas)\b/i;
const IRREGULAR_PARTICIPLES = /\b(feito|feita|feitos|feitas|dito|dita|ditos|ditas|escrito|escrita|escritos|escritas|visto|vista|vistos|vistas|posto|posta|postos|postas|aberto|aberta|abertos|abertas|coberto|coberta|cobertos|cobertas|descrito|descrita|descritos|descritas|eleito|eleita|eleitos|eleitas|exposto|exposta|expostos|expostas|impresso|impressa|impressos|impressas|incluso|inclusa|inclusos|inclusas|morto|morta|mortos|mortas|preso|presa|presos|presas|previsto|prevista|previstos|previstas|proposto|proposta|propostos|propostas|resolvido|resolvida|resolvidos|resolvidas|satisfeito|satisfeita|satisfeitos|satisfeitas|suspenso|suspensa|suspensos|suspensas|aceito|aceita|aceitos|aceitas|entregue|entregues)\b/i;

const FALSE_POSITIVE_WORDS = new Set([
  "resultado", "resultados", "resultada", "resultadas",
  "conteúdo", "conteúdos", "método", "métodos",
  "atributo", "atributos", "período", "períodos",
  "estado", "estados", "grau", "graus",
  "sentido", "sentidos", "modo", "modos",
  "cuidado", "cuidados", "significado", "significados",
  "passado", "passados", "mercado", "mercados",
  "lado", "lados", "dado", "dados",
  "pedido", "pedidos", "partido", "partidos",
  "tamanho", "tamanhos", "quadrado", "quadrados",
  "privado", "privada", "privados", "privadas",
  "elevado", "elevada", "elevados", "elevadas",
  "adequado", "adequada", "adequados", "adequadas",
  "determinado", "determinada", "determinados", "determinadas",
  "conhecido", "conhecida", "conhecidos", "conhecidas",
  "devido", "devida", "devidos", "devidas",
  "todo", "toda", "todos", "todas",
  "tido", "tida", "tidos", "tidas",
  "sido",
]);

function isParticiple(word: string): boolean {
  const clean = word.replace(/[.,;:!?"'()]/g, "").toLowerCase();
  if (FALSE_POSITIVE_WORDS.has(clean)) return false;
  return PARTICIPLE_PATTERN.test(clean) || IRREGULAR_PARTICIPLES.test(clean);
}

export interface PassiveMatch {
  sentence: string;
  index: number;
}

export function detectPassiveVoice(text: string): PassiveMatch[] {
  const sentences = splitIntoSentences(text);
  const results: PassiveMatch[] = [];
  let charIndex = 0;

  for (const sentence of sentences) {
    const idx = text.indexOf(sentence, charIndex);
    const words = sentence.split(/\s+/);

    let found = false;
    for (let i = 0; i < words.length - 1; i++) {
      const cleanWord = words[i].replace(/[.,;:!?"'()]/g, "");
      if (PASSIVE_AUX.test(cleanWord) && isParticiple(words[i + 1])) {
        found = true;
        break;
      }
    }
    if (found) {
      results.push({ sentence, index: idx >= 0 ? idx : charIndex });
    }
    charIndex = idx >= 0 ? idx + sentence.length : charIndex + sentence.length;
  }

  return results;
}

export const TRANSITION_WORDS: string[] = [
  "antecipadamente", "antes de mais nada", "antes de tudo", "a princípio",
  "de antemão", "acima de tudo", "à primeira vista", "desde já",
  "primeiramente", "sobretudo", "primordialmente", "principalmente",
  "em primeiro lugar",
  "ainda mais", "assim como", "do mesmo modo", "bem como",
  "contudo", "juntamente com", "apesar disso", "em outras palavras",
  "nesse sentido", "por exemplo", "seja como for", "todavia",
  "ainda assim", "porém", "além disso", "ou seja",
  "agora", "apenas", "constantemente", "depois que", "desde que",
  "enquanto", "em seguida", "logo depois", "imediatamente",
  "frequentemente", "ao mesmo tempo", "posteriormente", "então",
  "eventualmente", "finalmente", "anteriormente", "nesse ínterim",
  "simultaneamente", "atualmente", "nesse meio tempo", "ao passo que",
  "antes que", "às vezes", "por vezes", "pouco antes", "pouco depois",
  "ocasionalmente", "raramente", "sempre que", "todas as vezes que",
  "analogamente", "da mesma forma", "de acordo com", "desse modo",
  "igualmente", "sob o mesmo ponto de vista", "assim também",
  "conforme", "de maneira idêntica", "segundo", "tanto quanto",
  "tal qual", "por outro lado", "em contrapartida", "ao contrário",
  "do contrário", "por analogia", "similarmente",
  "enfim", "em síntese", "em suma", "definitivamente", "afinal",
  "dessa forma", "assim", "logo", "por fim", "como resultado",
  "por último", "portanto", "em conclusão",
  "no entanto", "entretanto", "por conseguinte", "consequentemente",
  "isto é", "ou melhor", "por isso", "desse modo", "dessa maneira",
  "em resumo", "em virtude de", "por causa de", "com efeito",
  "de fato", "na verdade", "com isso", "sendo assim", "visto que",
  "uma vez que", "já que", "pois", "porque", "dado que",
  "tendo em vista", "haja vista", "a fim de", "com o intuito de",
  "para que", "de modo que", "de forma que", "a menos que",
  "salvo se", "caso", "embora", "mesmo que", "ainda que",
  "conquanto", "não obstante", "sem dúvida", "certamente",
  "evidentemente", "obviamente", "provavelmente", "possivelmente",
  "talvez", "aparentemente", "supostamente",
];

export function countTransitionSentences(text: string): { total: number; withTransition: number; percentage: number } {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return { total: 0, withTransition: 0, percentage: 0 };

  const transitionRegexes = TRANSITION_WORDS.map(w => {
    const escaped = w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[\\s,;:.()"'])${escaped}(?:[\\s,;:.()"']|$)`, "i");
  });
  let withTransition = 0;

  for (const sentence of sentences) {
    if (transitionRegexes.some(re => re.test(sentence))) {
      withTransition++;
    }
  }

  return {
    total: sentences.length,
    withTransition,
    percentage: Math.round((withTransition / sentences.length) * 100),
  };
}

export interface ConsecutiveMatch {
  word: string;
  sentences: string[];
  startIndex: number;
}

export function findConsecutiveSameStart(text: string): ConsecutiveMatch[] {
  const sentences = splitIntoSentences(text);
  const results: ConsecutiveMatch[] = [];

  for (let i = 0; i < sentences.length - 2; i++) {
    const getFirstWord = (s: string) => s.split(/\s+/)[0]?.toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç]/gi, "") || "";
    const w1 = getFirstWord(sentences[i]);
    const w2 = getFirstWord(sentences[i + 1]);
    const w3 = getFirstWord(sentences[i + 2]);

    if (w1 && w1 === w2 && w2 === w3) {
      const already = results.find(r => r.sentences.includes(sentences[i]));
      if (!already) {
        let end = i + 3;
        while (end < sentences.length && getFirstWord(sentences[end]) === w1) end++;
        const idx = text.indexOf(sentences[i]);
        results.push({
          word: w1,
          sentences: sentences.slice(i, end),
          startIndex: idx >= 0 ? idx : 0,
        });
        i = end - 1;
      }
    }
  }

  return results;
}

export interface TextSection {
  heading: string;
  headingTag: string;
  content: string;
  wordCount: number;
}

export function extractTextSections(html: string): TextSection[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  const sections: TextSection[] = [];

  let currentHeading = "";
  let currentTag = "";
  let currentContent: string[] = [];

  const flushSection = () => {
    const content = currentContent.join(" ").trim();
    if (content || currentHeading) {
      sections.push({
        heading: currentHeading,
        headingTag: currentTag,
        content,
        wordCount: countWords(content),
      });
    }
    currentContent = [];
  };

  for (const node of Array.from(body.children)) {
    const tag = node.tagName?.toUpperCase();
    if (tag === "H2" || tag === "H3" || tag === "H1") {
      flushSection();
      currentHeading = node.textContent?.trim() || "";
      currentTag = tag;
    } else {
      currentContent.push(node.textContent?.trim() || "");
    }
  }

  flushSection();
  return sections;
}

export function extractParagraphs(html: string): { text: string; wordCount: number }[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const paragraphs = doc.querySelectorAll("p");
  return Array.from(paragraphs).map(p => {
    const text = p.textContent?.trim() || "";
    return { text, wordCount: countWords(text) };
  });
}

export function getLongSentences(text: string, maxWords: number = 25): { sentence: string; wordCount: number }[] {
  const sentences = splitIntoSentences(text);
  return sentences
    .map(s => ({ sentence: s, wordCount: countWords(s) }))
    .filter(s => s.wordCount > maxWords);
}
