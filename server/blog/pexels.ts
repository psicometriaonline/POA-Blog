// ============================================================
// Busca de imagem de destaque no Pexels (Fase pos-1).
//
// Usa a API do Pexels (gratuita, com chave) para achar uma imagem tematica para
// o rascunho. Fail-open: sem PEXELS_API_KEY ou sem resultado, devolve null e o
// post fica sem featuredImage (o revisor humano escolhe uma na aprovacao).
//
// Anti-repeticao: busca varios resultados (per_page=15) e escolhe a primeira
// foto ainda NAO usada como featured_image por outro post (comparacao pelo id
// da foto no path do Pexels, robusta a variantes de tamanho/query string).
// Fallback: se todas ja foram usadas, devolve a MENOS usada.
//
// Config: PEXELS_API_KEY (secret).
// ============================================================

export interface ImagemPexels {
  url: string; // URL da imagem (hospedada no Pexels; licenca permite uso)
  photographer: string;
  photographerUrl: string;
  alt: string;
}

// Extrai um identificador estavel da foto a partir de qualquer URL do Pexels
// (ex.: https://images.pexels.com/photos/12345/nome.jpeg?auto=... -> "12345").
// Para URLs nao-Pexels, usa a URL sem query string como chave.
export function chaveFotoPexels(url: string): string {
  const m = url.match(/\/photos\/(\d+)\//);
  if (m) return m[1];
  return url.split("?")[0];
}

// Busca a melhor imagem (paisagem) para uma query, evitando fotos ja usadas.
// `urlsUsadas`: URLs de featured_image ja gravadas em outros posts. Null se nao
// houver chave, resultado, ou em qualquer erro de rede.
export async function buscarImagemPexels(
  query: string,
  urlsUsadas: string[] = [],
): Promise<ImagemPexels | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key || !query.trim()) return null;
  try {
    const url =
      `https://api.pexels.com/v1/search?per_page=15&orientation=landscape&size=large` +
      `&query=${encodeURIComponent(query.trim())}`;
    const resp = await fetch(url, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      photos?: Array<{
        src?: { large2x?: string; large?: string; medium?: string };
        photographer?: string;
        photographer_url?: string;
        alt?: string;
      }>;
    };
    const candidatas = (json.photos ?? [])
      .map((foto) => {
        const src = foto?.src?.large2x || foto?.src?.large || foto?.src?.medium;
        if (!src) return null;
        return {
          url: src,
          photographer: foto?.photographer ?? "",
          photographerUrl: foto?.photographer_url ?? "",
          alt: foto?.alt ?? "",
        } as ImagemPexels;
      })
      .filter((c): c is ImagemPexels => c !== null);
    if (candidatas.length === 0) return null;

    // Contagem de uso por chave de foto.
    const usoPorChave = new Map<string, number>();
    for (const u of urlsUsadas) {
      const k = chaveFotoPexels(u);
      usoPorChave.set(k, (usoPorChave.get(k) ?? 0) + 1);
    }

    // Primeira foto nunca usada (na ordem de relevancia do Pexels).
    const inedita = candidatas.find((c) => !usoPorChave.has(chaveFotoPexels(c.url)));
    if (inedita) return inedita;

    // Fallback: todas ja usadas -> a menos usada.
    let melhor = candidatas[0];
    let menorUso = usoPorChave.get(chaveFotoPexels(melhor.url)) ?? 0;
    for (const c of candidatas.slice(1)) {
      const uso = usoPorChave.get(chaveFotoPexels(c.url)) ?? 0;
      if (uso < menorUso) {
        melhor = c;
        menorUso = uso;
      }
    }
    return melhor;
  } catch {
    return null;
  }
}
