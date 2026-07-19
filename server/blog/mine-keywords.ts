// ============================================================
// CLI de mineracao (Fase 0): minera e IMPRIME as top perguntas por cluster,
// para conferir a qualidade a olho ANTES de gerar qualquer post (Secao 8/9).
//
// Uso:
//   tsx server/blog/mine-keywords.ts                 # todos os eixos-piloto, pt+en
//   tsx server/blog/mine-keywords.ts --eixo 1        # so o 1o eixo
//   tsx server/blog/mine-keywords.ts --lang pt       # so pt-BR
//   tsx server/blog/mine-keywords.ts --top 20        # 20 sugestoes por cluster
//   tsx server/blog/mine-keywords.ts --persist       # grava na fila (precisa DB)
//
// O modo padrao (sem --persist) NAO toca no banco: da para rodar e calibrar sem
// DATABASE_URL. O --persist enfileira e roda a anti-canibalizacao (Camada 1).
// ============================================================

import { EIXOS_PILOTO, type Eixo } from "@shared/blog/seeds";
import { minerarEixo } from "./mine-runner";
import type { Lang } from "./keyword-research";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  let persist = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--persist") persist = true;
    else if (a.startsWith("--")) args[a.slice(2)] = argv[++i] ?? "";
  }
  return { args, persist };
}

function selecionarEixos(sel: string | undefined): Eixo[] {
  if (!sel) return EIXOS_PILOTO;
  const idx = Number(sel);
  if (Number.isInteger(idx) && idx >= 1 && idx <= EIXOS_PILOTO.length) {
    return [EIXOS_PILOTO[idx - 1]];
  }
  const s = sel.toLowerCase();
  const match = EIXOS_PILOTO.filter(
    (e) => e.macro.toLowerCase().includes(s) || e.categorySlug.includes(s),
  );
  return match.length > 0 ? match : EIXOS_PILOTO;
}

async function main() {
  const { args, persist } = parseArgs(process.argv.slice(2));
  const langs = (args.lang ? args.lang.split(",") : ["pt", "en"])
    .map((l) => l.trim())
    .filter((l): l is Lang => l === "pt" || l === "en");
  const top = Number(args.top) > 0 ? Number(args.top) : 12;
  const delayMs = Number(args.delay) >= 0 ? Number(args.delay) : 200;
  const eixos = selecionarEixos(args.eixo);

  // Import tardio (so no --persist) para o modo impressao rodar sem DATABASE_URL.
  const enfileirar = persist ? (await import("./keyword-queue")).enfileirarSugestoes : null;

  console.log(
    `\nMineracao (${langs.join("+")}) — ${eixos.length} eixo(s), top ${top}/cluster${
      persist ? ", PERSISTINDO na fila" : " (dry-run, sem banco)"
    }\n`,
  );

  for (const eixo of eixos) {
    console.log("=".repeat(72));
    console.log(`EIXO: ${eixo.macro}`);
    console.log(`  categoria: ${eixo.categorySlug}  |  curso-alvo: ${eixo.cursoAlvo}`);
    console.log("=".repeat(72));

    const clusters = await minerarEixo(eixo, langs, { delayMs });
    let totalSug = 0;
    let totalPerg = 0;
    const stats = { novas: 0, reforcadas: 0, ignoradas: 0, canibalizadas: 0 };

    for (const c of clusters) {
      const perguntas = c.sugestoes.filter((s) => s.isQuestion);
      totalSug += c.sugestoes.length;
      totalPerg += perguntas.length;

      console.log(`\n  ▸ ${c.subcategoria}  (prioridade ${c.priority})`);
      if (c.sugestoes.length === 0) {
        console.log("      (0 sugestoes — semente curada vira topico mesmo assim, Secao 5.3)");
      }
      for (const s of c.sugestoes.slice(0, top)) {
        console.log(
          `      [${String(s.score).padStart(3)}] ${s.isQuestion ? "Q" : " "} ${s.lang}  ${s.query}`,
        );
      }

      if (enfileirar) {
        const r = await enfileirar(eixo.macro, c.subcategoria, c.priority, c.sugestoes);
        stats.novas += r.novas;
        stats.reforcadas += r.reforcadas;
        stats.ignoradas += r.ignoradas;
        stats.canibalizadas += r.canibalizadas;
      }
    }

    console.log(
      `\n  RESUMO ${eixo.macro}: ${totalSug} sugestoes (${totalPerg} perguntas) em ${clusters.length} clusters.`,
    );
    if (enfileirar) {
      console.log(
        `  FILA: +${stats.novas} novas, ${stats.reforcadas} reforcadas, ${stats.ignoradas} ruido, ${stats.canibalizadas} ja cobertas (anti-canibalizacao).`,
      );
    }
  }

  console.log("\nConcluido.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha na mineracao:", err);
  process.exit(1);
});
