// ============================================================
// CLI de PREVIEW (Fase 1): puxa a busca-alvo mais forte, gera + revisa + resolve
// citacoes e IMPRIME tudo SEM publicar e SEM tocar a fila. E como se calibra a
// qualidade barato antes de ligar a geracao real (Secao 9 do mapa).
//
// Uso (no Replit — precisa ANTHROPIC_API_KEY; a versao sem --query le a fila,
// entao precisa DATABASE_URL):
//   tsx server/blog/preview-post.ts --eixo 1
//   tsx server/blog/preview-post.ts --eixo 2 --query "como interpretar o RMSEA"
// ============================================================

import { EIXOS_PILOTO, type Eixo } from "@shared/blog/seeds";
import { gerarRevisarCitar } from "./daily-generator";
import { proximoAlvo, perguntasDoCluster } from "./keyword-queue";

function parseArgs(argv: string[]) {
  const a: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[++i] ?? "";
  }
  return a;
}

function selecionarEixo(sel: string | undefined): Eixo {
  const idx = Number(sel);
  if (Number.isInteger(idx) && idx >= 1 && idx <= EIXOS_PILOTO.length) return EIXOS_PILOTO[idx - 1];
  return EIXOS_PILOTO[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const eixo = selecionarEixo(args.eixo);

  let targetQuery = args.query?.trim() || "";
  let subcategoria: string | null = null;
  let relacionadas: string[] = [];

  if (!targetQuery) {
    const alvo = await proximoAlvo(eixo.macro);
    if (!alvo) {
      console.log(`Fila do eixo "${eixo.macro}" esta vazia. Minere primeiro (mine-keywords --persist).`);
      process.exit(0);
    }
    targetQuery = alvo.query;
    subcategoria = alvo.subcategoria;
    relacionadas = (await perguntasDoCluster(eixo.macro, alvo.subcategoria, alvo.id, 8)).map((q) => q.query);
  }

  console.log(`\nPREVIEW — eixo "${eixo.macro}"`);
  console.log(`  busca-alvo: "${targetQuery}"  |  cluster: ${subcategoria ?? "(livre)"}`);
  console.log(`  relacionadas: ${relacionadas.length}\n`);

  const { post, verificacao, correcoes, citacoes } = await gerarRevisarCitar(
    eixo,
    targetQuery,
    relacionadas,
    subcategoria,
  );

  console.log("=".repeat(72));
  console.log(`TITULO: ${post.title}`);
  console.log(`SUBTITULO: ${post.subtitle}`);
  console.log(`RESUMO: ${post.excerpt}`);
  console.log(`KEYWORDS: ${post.keywords.join(", ")}`);
  console.log("=".repeat(72));
  for (const s of post.body) {
    if (s.heading) console.log(`\n## ${s.heading}`);
    for (const p of s.paragraphs) console.log(p);
  }
  if (post.referencias.length) {
    console.log("\n## Referencias (resolvidas por DOI)");
    post.referencias.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  }
  console.log("\n" + "-".repeat(72));
  console.log(`REVISOR: ${verificacao.aprovado ? "APROVADO" : "REPROVADO"} apos ${correcoes} correcao(oes).`);
  if (verificacao.motivos.length) console.log("  motivos: " + verificacao.motivos.join(" | "));
  console.log(`  checagens tecnicas: ${verificacao.checagens.length}`);
  console.log(
    `CITACOES: ${citacoes.itens.filter((i) => i.resolvida).length}/${citacoes.itens.length} resolvidas` +
      (citacoes.naoResolvidas.length ? ` (removidas: ${citacoes.naoResolvidas.length})` : ""),
  );
  console.log("\n(preview — NADA foi salvo nem publicado)\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha no preview:", err);
  process.exit(1);
});
