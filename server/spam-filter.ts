const SPAM_KEYWORDS = [
  "buy now", "click here", "free money", "make money", "earn money",
  "casino", "poker", "viagra", "cialis", "pills", "pharmacy",
  "loan", "mortgage", "credit card", "bitcoin", "crypto",
  "weight loss", "diet pills", "enlargement",
  "compre agora", "clique aqui", "dinheiro fácil", "ganhe dinheiro",
  "cassino", "apostas", "farmácia online",
  "empréstimo", "cartão de crédito",
];

const SUSPICIOUS_EMAIL_PATTERNS = [
  /^[a-z]{1,3}\d{5,}@/i,
  /@(tempmail|guerrillamail|mailinator|throwaway|yopmail|sharklasers)\./i,
  /\.(xyz|top|club|info|bid|stream|download|gdn|racing)\s*$/i,
];

export function isLikelySpam(
  name: string,
  email: string,
  content: string
): { isSpam: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lowerContent = content.toLowerCase();
  const lowerName = name.toLowerCase();

  const urlMatches = content.match(/https?:\/\/[^\s<]+/gi) || [];
  if (urlMatches.length > 2) {
    reasons.push(`Muitos links (${urlMatches.length})`);
  }

  const foundKeywords = SPAM_KEYWORDS.filter((kw) => lowerContent.includes(kw));
  if (foundKeywords.length > 0) {
    reasons.push(`Palavras-chave suspeitas: ${foundKeywords.join(", ")}`);
  }

  if (content.length > 10 && content === content.toUpperCase() && /[A-Z]/.test(content)) {
    reasons.push("Texto todo em maiúsculas");
  }

  if (content.length < 20 && urlMatches.length > 0) {
    reasons.push("Conteúdo curto com link");
  }

  for (const pattern of SUSPICIOUS_EMAIL_PATTERNS) {
    if (pattern.test(email)) {
      reasons.push("E-mail suspeito");
      break;
    }
  }

  const charCounts: Record<string, number> = {};
  for (const c of content.replace(/\s/g, "")) {
    charCounts[c] = (charCounts[c] || 0) + 1;
  }
  const totalChars = content.replace(/\s/g, "").length;
  if (totalChars > 10) {
    const maxRepeat = Math.max(...Object.values(charCounts));
    if (maxRepeat / totalChars > 0.5) {
      reasons.push("Caracteres muito repetitivos");
    }
  }

  const nameKeywords = ["admin", "seo", "marketing", "webmaster", "money", "casino"];
  if (nameKeywords.some((kw) => lowerName.includes(kw))) {
    reasons.push("Nome suspeito");
  }

  if (/<\s*(a|script|iframe|img|style|link)\b/i.test(content)) {
    reasons.push("HTML suspeito no conteúdo");
  }

  return { isSpam: reasons.length >= 2, reasons };
}
