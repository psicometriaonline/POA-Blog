// ============================================================
// Busca de imagem de destaque no Pexels (Fase pos-1).
//
// Usa a API do Pexels (gratuita, com chave) para achar uma imagem tematica para
// o rascunho. Fail-open: sem PEXELS_API_KEY ou sem resultado, devolve null e o
// post fica sem featuredImage (o revisor humano escolhe uma na aprovacao).
//
// Config: PEXELS_API_KEY (secret).
// ============================================================

export interface ImagemPexels {
  url: string; // URL da imagem (hospedada no Pexels; licenca permite uso)
  photographer: string;
  photographerUrl: string;
  alt: string;
}

// Busca a melhor imagem (paisagem) para uma query. Null se nao houver chave,
// resultado, ou em qualquer erro de rede.
export async function buscarImagemPexels(query: string): Promise<ImagemPexels | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key || !query.trim()) return null;
  try {
    const url =
      `https://api.pexels.com/v1/search?per_page=1&orientation=landscape&size=large` +
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
    const foto = json.photos?.[0];
    const src = foto?.src?.large2x || foto?.src?.large || foto?.src?.medium;
    if (!src) return null;
    return {
      url: src,
      photographer: foto?.photographer ?? "",
      photographerUrl: foto?.photographer_url ?? "",
      alt: foto?.alt ?? "",
    };
  } catch {
    return null;
  }
}
