import { stripHtml, countWords, extractTextSections } from "./portuguese-utils";

export type CheckStatus = "good" | "warning" | "problem";

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  highlightTexts?: string[];
}

interface SeoAnalysisInput {
  focusKeyword: string;
  seoTitle: string;
  metaDescription: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
}

function slugifyKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function containsKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function startsWithKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  const lower = text.toLowerCase().trim();
  const kw = keyword.toLowerCase().trim();
  return lower.startsWith(kw) || lower.indexOf(kw) <= 3;
}

export function analyzeSEO(input: SeoAnalysisInput): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const { focusKeyword, seoTitle, metaDescription, title, slug, content, excerpt } = input;
  const plainText = stripHtml(content);
  const wordCount = countWords(plainText);

  if (!focusKeyword || focusKeyword.trim().length === 0) {
    checks.push({
      id: "keyword-defined",
      label: "Palavra-chave de foco",
      status: "problem",
      message: "Nenhuma palavra-chave foi definida. Defina uma palavra-chave para calcular sua pontuação de SEO.",
    });
    checks.push(
      { id: "text-length", label: "Comprimento do texto", status: wordCount >= 300 ? "good" : "problem", message: wordCount >= 300 ? `O texto contém ${wordCount} palavras. Ótimo!` : `O texto contém ${wordCount} palavras. Adicione mais conteúdo (mínimo recomendado: 300 palavras).` },
      checkImages(content),
      checkUniqueH1(content),
      checkInternalLinks(content),
      checkExternalLinks(content),
    );
    return checks;
  }

  const kw = focusKeyword.trim();

  checks.push({
    id: "keyword-defined",
    label: "Palavra-chave de foco",
    status: "good",
    message: `Palavra-chave definida: "${kw}"`,
  });

  checks.push({
    id: "keyword-title",
    label: "Palavra-chave no título",
    status: containsKeyword(title, kw) ? "good" : "problem",
    message: containsKeyword(title, kw)
      ? "O título contém a palavra-chave. Ótimo!"
      : "O título não contém a palavra-chave. Adicione-a ao título do post.",
  });

  if (seoTitle) {
    checks.push({
      id: "keyword-seo-title",
      label: "Palavra-chave no título SEO",
      status: startsWithKeyword(seoTitle, kw) ? "good" : containsKeyword(seoTitle, kw) ? "warning" : "problem",
      message: startsWithKeyword(seoTitle, kw)
        ? "O título SEO começa com a palavra-chave. Ótimo!"
        : containsKeyword(seoTitle, kw)
          ? "O título SEO contém a palavra-chave, mas idealmente deveria começar com ela."
          : "O título SEO não contém a palavra-chave. Adicione-a ao início do título SEO.",
    });
  } else {
    checks.push({
      id: "keyword-seo-title",
      label: "Palavra-chave no título SEO",
      status: "problem",
      message: "Nenhum título SEO foi definido. Crie um título SEO que comece com a palavra-chave.",
    });
  }

  const slugKw = slugifyKeyword(kw);
  checks.push({
    id: "keyword-slug",
    label: "Palavra-chave no slug",
    status: slug.includes(slugKw) ? "good" : "warning",
    message: slug.includes(slugKw)
      ? "O slug contém a palavra-chave. Ótimo!"
      : "O slug não contém a palavra-chave. Considere incluí-la na URL.",
  });

  if (metaDescription) {
    checks.push({
      id: "keyword-meta",
      label: "Palavra-chave na meta descrição",
      status: containsKeyword(metaDescription, kw) ? "good" : "problem",
      message: containsKeyword(metaDescription, kw)
        ? "A meta descrição contém a palavra-chave. Ótimo!"
        : "A meta descrição não contém a palavra-chave. Adicione-a à meta descrição.",
    });
  } else {
    checks.push({
      id: "keyword-meta",
      label: "Palavra-chave na meta descrição",
      status: "problem",
      message: "Nenhuma meta descrição foi definida. Escreva uma meta descrição contendo a palavra-chave.",
    });
  }

  const doc = new DOMParser().parseFromString(content, "text/html");
  const paragraphs = doc.querySelectorAll("p");
  const firstParagraph = paragraphs.length > 0 ? (paragraphs[0].textContent || "") : "";
  checks.push({
    id: "keyword-intro",
    label: "Palavra-chave na introdução",
    status: containsKeyword(firstParagraph, kw) ? "good" : "problem",
    message: containsKeyword(firstParagraph, kw)
      ? "A palavra-chave aparece na introdução. Ótimo!"
      : "A palavra-chave não aparece no primeiro parágrafo. Adicione-a à introdução.",
    highlightTexts: containsKeyword(firstParagraph, kw) ? undefined : [firstParagraph.slice(0, 100)],
  });

  const headings = doc.querySelectorAll("h2, h3");
  const headingTexts = Array.from(headings).map(h => h.textContent || "");
  const headingsWithKw = headingTexts.filter(h => containsKeyword(h, kw));
  if (headingTexts.length === 0) {
    checks.push({
      id: "keyword-headings",
      label: "Palavra-chave nos subtítulos",
      status: "warning",
      message: "Não há subtítulos (H2/H3). Considere adicionar subtítulos com a palavra-chave.",
    });
  } else {
    const ratio = headingsWithKw.length / headingTexts.length;
    checks.push({
      id: "keyword-headings",
      label: "Palavra-chave nos subtítulos",
      status: ratio > 0 && ratio < 1 ? "good" : ratio === 0 ? "warning" : "warning",
      message:
        ratio === 0
          ? "Nenhum subtítulo contém a palavra-chave. Use-a em alguns subtítulos."
          : ratio === 1
            ? `Todos os ${headingTexts.length} subtítulos contêm a palavra-chave. Varie um pouco para não otimizar demais.`
            : `${headingsWithKw.length} de ${headingTexts.length} subtítulos contêm a palavra-chave. Boa distribuição!`,
    });
  }

  const images = doc.querySelectorAll("img");
  const imageAlts = Array.from(images).map(img => img.getAttribute("alt") || "");
  const altsWithKw = imageAlts.filter(alt => containsKeyword(alt, kw));
  if (images.length === 0) {
    checks.push({
      id: "keyword-images-alt",
      label: "Palavra-chave nos alt das imagens",
      status: "problem",
      message: "Não há imagens no conteúdo. Adicione imagens com atributos alt contendo a palavra-chave.",
    });
  } else if (altsWithKw.length === 0) {
    checks.push({
      id: "keyword-images-alt",
      label: "Palavra-chave nos alt das imagens",
      status: "problem",
      message: `Nenhuma das ${images.length} imagens tem a palavra-chave no atributo alt. Adicione-a em pelo menos uma.`,
    });
  } else {
    checks.push({
      id: "keyword-images-alt",
      label: "Palavra-chave nos alt das imagens",
      status: "good",
      message: `${altsWithKw.length} de ${images.length} imagens contêm a palavra-chave no alt. Ótimo!`,
    });
  }

  const kwLower = kw.toLowerCase();
  const kwCount = plainText.toLowerCase().split(kwLower).length - 1;
  const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;
  checks.push({
    id: "keyword-density",
    label: "Densidade da palavra-chave",
    status: density >= 0.5 && density <= 2.5 ? "good" : density > 2.5 ? "warning" : "warning",
    message:
      density >= 0.5 && density <= 2.5
        ? `A palavra-chave aparece ${kwCount} vezes (${density.toFixed(1)}%). Densidade adequada!`
        : density > 2.5
          ? `A palavra-chave aparece ${kwCount} vezes (${density.toFixed(1)}%). Reduza o uso para evitar otimização excessiva.`
          : `A palavra-chave aparece ${kwCount} vezes (${density.toFixed(1)}%). Considere usá-la mais vezes (0,5-2,5%).`,
  });

  if (metaDescription) {
    const len = metaDescription.length;
    checks.push({
      id: "meta-length",
      label: "Comprimento da meta descrição",
      status: len >= 100 && len <= 155 ? "good" : len > 0 && len < 100 ? "warning" : len > 155 ? "warning" : "problem",
      message:
        len >= 100 && len <= 155
          ? `Meta descrição com ${len} caracteres. Comprimento ideal!`
          : len < 100
            ? `Meta descrição com ${len} caracteres. Considere expandi-la (ideal: 100-155 caracteres).`
            : `Meta descrição com ${len} caracteres. Considere encurtá-la (ideal: 100-155 caracteres).`,
    });
  } else {
    checks.push({
      id: "meta-length",
      label: "Comprimento da meta descrição",
      status: "problem",
      message: "Nenhuma meta descrição foi especificada. Os mecanismos de busca exibirão o conteúdo da página.",
    });
  }

  if (seoTitle) {
    const len = seoTitle.length;
    checks.push({
      id: "seo-title-width",
      label: "Largura do título SEO",
      status: len > 0 && len <= 60 ? "good" : len > 60 && len <= 70 ? "warning" : "problem",
      message:
        len <= 60
          ? `Título SEO com ${len} caracteres. Bom tamanho!`
          : len <= 70
            ? `Título SEO com ${len} caracteres. Um pouco longo — tente até 60 caracteres.`
            : `Título SEO com ${len} caracteres. Muito longo — pode ser truncado nos resultados de busca.`,
    });
  } else {
    checks.push({
      id: "seo-title-width",
      label: "Largura do título SEO",
      status: "problem",
      message: "Nenhum título SEO foi definido. Defina um título SEO para os mecanismos de busca.",
    });
  }

  checks.push({
    id: "text-length",
    label: "Comprimento do texto",
    status: wordCount >= 300 ? "good" : "problem",
    message: wordCount >= 300
      ? `O texto contém ${wordCount} palavras. Ótimo!`
      : `O texto contém ${wordCount} palavras. Adicione mais conteúdo (mínimo recomendado: 300 palavras).`,
  });

  checks.push(checkInternalLinks(content));
  checks.push(checkExternalLinks(content));
  checks.push(checkImages(content));
  checks.push(checkUniqueH1(content));

  return checks;
}

function checkInternalLinks(content: string): SeoCheck {
  const doc = new DOMParser().parseFromString(content, "text/html");
  const links = doc.querySelectorAll("a[href]");
  const internal = Array.from(links).filter(a => {
    const href = a.getAttribute("href") || "";
    return href.startsWith("/") || href.includes(window.location.hostname) || href.includes("psicometriaonline");
  });
  return {
    id: "internal-links",
    label: "Links internos",
    status: internal.length > 0 ? "good" : "problem",
    message: internal.length > 0
      ? `${internal.length} link(s) interno(s) encontrado(s). Ótimo!`
      : "Não há links internos nesta página. Adicione alguns!",
  };
}

function checkExternalLinks(content: string): SeoCheck {
  const doc = new DOMParser().parseFromString(content, "text/html");
  const links = doc.querySelectorAll("a[href]");
  const external = Array.from(links).filter(a => {
    const href = a.getAttribute("href") || "";
    return href.startsWith("http") && !href.includes(window.location.hostname) && !href.includes("psicometriaonline");
  });
  return {
    id: "external-links",
    label: "Links externos",
    status: external.length > 0 ? "good" : "problem",
    message: external.length > 0
      ? `${external.length} link(s) externo(s) encontrado(s). Ótimo!`
      : "Não há links externos nesta página. Adicione alguns!",
  };
}

function checkImages(content: string): SeoCheck {
  const doc = new DOMParser().parseFromString(content, "text/html");
  const images = doc.querySelectorAll("img");
  return {
    id: "images-present",
    label: "Imagens",
    status: images.length > 0 ? "good" : "problem",
    message: images.length > 0
      ? `${images.length} imagem(ns) encontrada(s). Ótimo!`
      : "Não há imagens nesta página. Adicione algumas!",
  };
}

function checkUniqueH1(content: string): SeoCheck {
  const doc = new DOMParser().parseFromString(content, "text/html");
  const h1s = doc.querySelectorAll("h1");
  return {
    id: "unique-h1",
    label: "Título H1 único",
    status: h1s.length <= 1 ? "good" : "warning",
    message: h1s.length <= 1
      ? "Não há múltiplos títulos H1. Parabéns!"
      : `Foram encontrados ${h1s.length} títulos H1. Use apenas um H1 por página.`,
  };
}
