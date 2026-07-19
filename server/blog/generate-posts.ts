// ============================================================
// CLI do gerador (Fase 1): roda a geracao real, criando RASCUNHOS no CMS, um
// cluster por vez, ate o cap diario (BLOG_MAX_POSTS_DIA, default 3) ou acabar a
// fila. Nunca publica. Escreve na tabela posts de PRODUCAO -> rodar no Replit.
//
// Uso (no Replit — precisa ANTHROPIC_API_KEY, DATABASE_URL e, para a Camada 2,
// BLOG_EMBEDDING_*):
//   tsx server/blog/generate-posts.ts          # ate o cap diario
//   tsx server/blog/generate-posts.ts --once    # um unico cluster
// ============================================================

import { rodarProximaGeracao } from "./daily-generator";

async function main() {
  const once = process.argv.includes("--once");
  let criados = 0;

  while (true) {
    const r = await rodarProximaGeracao();
    if (r.processed === null) {
      console.log(
        r.remaining === 0 && criados === 0
          ? "Nada a gerar (fila vazia ou cap diario ja atingido)."
          : "Sem mais clusters pendentes hoje.",
      );
      break;
    }
    if (r.status === "draft") criados += 1;
    console.log(`[${r.status}] eixo="${r.processed}"  restam~${r.remaining}`);
    if (once || r.remaining === 0) break;
  }

  console.log(`\nConcluido. Rascunhos criados nesta execucao: ${criados}. Revise-os no /admin antes de publicar.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha na geracao:", err);
  process.exit(1);
});
