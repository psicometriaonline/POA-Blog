import {
  stripHtml,
  countWords,
  splitIntoSentences,
  detectPassiveVoice,
  countTransitionSentences,
  findConsecutiveSameStart,
  extractTextSections,
  extractParagraphs,
  extractSentencesFromHtml,
} from "./portuguese-utils";
import type { SeoCheck } from "./seo-analyzer";

export function analyzeReadability(content: string): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const plainText = stripHtml(content);
  const totalWords = countWords(plainText);
  const sentences = splitIntoSentences(plainText);

  const passiveMatches = detectPassiveVoice(plainText);
  const passivePercent = sentences.length > 0 ? (passiveMatches.length / sentences.length) * 100 : 0;
  checks.push({
    id: "passive-voice",
    label: "Voz passiva",
    status: passivePercent < 10 ? "good" : passivePercent < 15 ? "warning" : "problem",
    message:
      passivePercent < 10
        ? `${passivePercent.toFixed(0)}% de frases com voz passiva. Ótimo!`
        : passivePercent < 15
          ? `${passivePercent.toFixed(0)}% de frases com voz passiva. Tente reduzir para menos de 10%.`
          : `${passivePercent.toFixed(0)}% de frases com voz passiva. Reescreva algumas na voz ativa (ideal: < 10%).`,
    highlightTexts: passiveMatches.length > 0 ? passiveMatches.map(m => m.sentence) : undefined,
  });

  const consecutiveMatches = findConsecutiveSameStart(plainText);
  checks.push({
    id: "consecutive-sentences",
    label: "Frases consecutivas",
    status: consecutiveMatches.length === 0 ? "good" : "problem",
    message:
      consecutiveMatches.length === 0
        ? "Não há repetições no início das frases. Ótimo!"
        : `${consecutiveMatches.length} grupo(s) de 3+ frases consecutivas começando com a mesma palavra ("${consecutiveMatches.map(m => m.word).join('", "')}"). Varie o início das frases.`,
    highlightTexts: consecutiveMatches.length > 0
      ? consecutiveMatches.flatMap(m => m.sentences)
      : undefined,
  });

  const sections = extractTextSections(content);
  const longSections = sections.filter(s => s.wordCount > 300);
  checks.push({
    id: "section-length",
    label: "Distribuição de subtítulos",
    status: longSections.length === 0 ? "good" : "warning",
    message:
      longSections.length === 0
        ? totalWords < 300
          ? "O texto é curto o suficiente e provavelmente não precisa de mais subtítulos."
          : "Nenhuma seção excede 300 palavras. Excelente distribuição!"
        : `${longSections.length} seção(ões) com mais de 300 palavras. Considere adicionar subtítulos para quebrá-las.`,
    highlightTexts: longSections.length > 0 ? longSections.map(s => s.heading || s.content.slice(0, 80)) : undefined,
  });

  const paragraphs = extractParagraphs(content);
  const longParagraphs = paragraphs.filter(p => p.wordCount > 150);
  checks.push({
    id: "paragraph-length",
    label: "Extensão dos parágrafos",
    status: longParagraphs.length === 0 ? "good" : "warning",
    message:
      longParagraphs.length === 0
        ? "Não há parágrafos muito longos. Excelente!"
        : `${longParagraphs.length} parágrafo(s) com mais de 150 palavras. Quebre ideias longas em parágrafos menores.`,
    highlightTexts: longParagraphs.length > 0 ? longParagraphs.map(p => p.text.slice(0, 100)) : undefined,
  });

  const htmlSentences = extractSentencesFromHtml(content);
  const longSentences = htmlSentences
    .map(s => ({ sentence: s, wordCount: countWords(s) }))
    .filter(s => s.wordCount > 20);
  const longPercent = htmlSentences.length > 0 ? (longSentences.length / htmlSentences.length) * 100 : 0;
  checks.push({
    id: "sentence-length",
    label: "Extensão das frases",
    status: longPercent < 25 ? "good" : longPercent <= 30 ? "warning" : "problem",
    message:
      longPercent < 25
        ? `${longPercent.toFixed(0)}% de frases longas (> 20 palavras). Ótimo!`
        : longPercent <= 30
          ? `${longPercent.toFixed(0)}% de frases longas (> 20 palavras). Tente simplificar algumas (ideal: < 25%).`
          : `${longPercent.toFixed(0)}% de frases longas (> 20 palavras). Muitas frases complexas dificultam a compreensão.`,
    highlightTexts: longSentences.length > 0 ? longSentences.map(s => s.sentence) : undefined,
  });

  const transition = countTransitionSentences(plainText);
  if (totalWords >= 300) {
    checks.push({
      id: "transition-words",
      label: "Palavras de transição",
      status: transition.percentage >= 30 ? "good" : transition.percentage >= 20 ? "warning" : "problem",
      message:
        transition.percentage >= 30
          ? `${transition.percentage}% das frases usam palavras de transição. Ótimo!`
          : transition.percentage >= 20
            ? `${transition.percentage}% das frases usam palavras de transição. Tente chegar a 30%.`
            : `${transition.percentage}% das frases usam palavras de transição. Adicione mais para melhorar a fluidez.`,
    });
  } else {
    checks.push({
      id: "transition-words",
      label: "Palavras de transição",
      status: "good",
      message: "O texto é curto o suficiente e provavelmente não necessita muitas palavras de transição.",
    });
  }

  return checks;
}
