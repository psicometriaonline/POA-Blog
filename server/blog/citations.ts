// ============================================================
// Verificacao de citacoes por DOI (Fase 1, Secao 5.6/E do mapa).
//
// Passo DETERMINISTICO (codigo, nao LLM) entre gerar e publicar. Para cada
// referencia citada pelo escritor, resolve contra a Crossref (gratuita, sem
// chave) e, como reforco, a OpenAlex. Correspondencia forte (titulo muito
// similar + ano compativel) => citacao confirmada; adotamos os metadados
// canonicos da base e guardamos o DOI. Sem correspondencia => tratada como
// inexistente (nao publica).
//
// Portao: o post so pode ser publicado quando 100% das referencias resolvem;
// caso contrario vai para rascunho/revisao humana (que ja e o modo desta fase).
// Fail-closed: erro de rede conta como NAO resolvida (nunca confirma no escuro).
// ============================================================

const MAILTO = process.env.BLOG_CROSSREF_MAILTO || "contato@psicometriaonline.com.br";
const UA = `PsicometriaOnlineBlog/1.0 (mailto:${MAILTO})`;

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function anoDe(texto: string): number | null {
  const m = texto.match(/\b(18|19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

// Cobertura: fracao dos tokens significativos do titulo da base presentes na
// referencia crua. Alta cobertura + ano compativel = correspondencia forte.
function cobertura(tituloBase: string, refCrua: string): number {
  const tokens = normalizar(tituloBase)
    .split(" ")
    .filter((t) => t.length >= 4);
  if (tokens.length === 0) return 0;
  const refset = new Set(normalizar(refCrua).split(" "));
  const acertos = tokens.filter((t) => refset.has(t)).length;
  return acertos / tokens.length;
}

const COBERTURA_MIN = 0.75;

export interface RefResolvida {
  original: string;
  resolvida: boolean;
  doi?: string;
  canonical?: string; // referencia canonica reescrita (autor, ano, titulo, veiculo, DOI)
  fonte?: "crossref" | "openalex";
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, timeoutMs = 12000): Promise<any | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function montarCanonica(
  autores: string[],
  ano: number | null,
  titulo: string,
  veiculo: string | null,
  doi: string,
): string {
  const autor =
    autores.length === 0
      ? ""
      : autores.length === 1
        ? autores[0]
        : autores.length <= 3
          ? autores.join(", ")
          : `${autores[0]} et al.`;
  const partes = [
    autor && `${autor}`,
    ano && `(${ano})`,
    titulo && `${titulo}.`,
    veiculo && `${veiculo}.`,
    `https://doi.org/${doi}`,
  ].filter(Boolean);
  return partes.join(" ");
}

async function tentarCrossref(ref: string): Promise<RefResolvida | null> {
  const url = `https://api.crossref.org/works?rows=5&mailto=${encodeURIComponent(
    MAILTO,
  )}&query.bibliographic=${encodeURIComponent(ref)}`;
  const json = await getJson(url);
  const itens: any[] = json?.message?.items ?? [];
  const anoRef = anoDe(ref);

  for (const it of itens) {
    const titulo: string = (it.title?.[0] ?? "").trim();
    if (!titulo) continue;
    const anoItem: number | null =
      it.issued?.["date-parts"]?.[0]?.[0] ?? it["published-print"]?.["date-parts"]?.[0]?.[0] ?? null;
    const cob = cobertura(titulo, ref);
    const anoOk = !anoRef || !anoItem || Math.abs(anoRef - anoItem) <= 1;
    if (cob >= COBERTURA_MIN && anoOk && it.DOI) {
      const autores: string[] = (it.author ?? [])
        .map((a: any) => a.family || a.name)
        .filter(Boolean);
      const veiculo: string | null = it["container-title"]?.[0] ?? null;
      return {
        original: ref,
        resolvida: true,
        doi: it.DOI,
        canonical: montarCanonica(autores, anoItem, titulo, veiculo, it.DOI),
        fonte: "crossref",
      };
    }
  }
  return null;
}

async function tentarOpenAlex(ref: string): Promise<RefResolvida | null> {
  const url = `https://api.openalex.org/works?per-page=5&mailto=${encodeURIComponent(
    MAILTO,
  )}&search=${encodeURIComponent(ref)}`;
  const json = await getJson(url);
  const itens: any[] = json?.results ?? [];
  const anoRef = anoDe(ref);

  for (const it of itens) {
    const titulo: string = (it.title ?? it.display_name ?? "").trim();
    if (!titulo) continue;
    const anoItem: number | null = it.publication_year ?? null;
    const doiRaw: string | null = it.doi ?? it.ids?.doi ?? null;
    const doi = doiRaw ? doiRaw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : null;
    const cob = cobertura(titulo, ref);
    const anoOk = !anoRef || !anoItem || Math.abs(anoRef - anoItem) <= 1;
    if (cob >= COBERTURA_MIN && anoOk && doi) {
      const autores: string[] = (it.authorships ?? [])
        .map((a: any) => a.author?.display_name)
        .filter(Boolean);
      const veiculo: string | null =
        it.primary_location?.source?.display_name ?? it.host_venue?.display_name ?? null;
      return {
        original: ref,
        resolvida: true,
        doi,
        canonical: montarCanonica(autores, anoItem, titulo, veiculo, doi),
        fonte: "openalex",
      };
    }
  }
  return null;
}

// Resolve uma referencia: Crossref primeiro, OpenAlex como reforco.
export async function resolverReferencia(ref: string): Promise<RefResolvida> {
  if (!ref.trim()) return { original: ref, resolvida: false };
  const cr = await tentarCrossref(ref);
  if (cr) return cr;
  const oa = await tentarOpenAlex(ref);
  if (oa) return oa;
  return { original: ref, resolvida: false };
}

export interface ResultadoCitacoes {
  todasResolvidas: boolean;
  itens: RefResolvida[];
  naoResolvidas: string[];
}

// Resolve a lista inteira. Sequencial e gentil (as bases sao gratuitas).
export async function resolverReferencias(refs: string[]): Promise<ResultadoCitacoes> {
  const itens: RefResolvida[] = [];
  for (const ref of refs) {
    itens.push(await resolverReferencia(ref));
    await dormir(150);
  }
  const naoResolvidas = itens.filter((i) => !i.resolvida).map((i) => i.original);
  return { todasResolvidas: naoResolvidas.length === 0, itens, naoResolvidas };
}
