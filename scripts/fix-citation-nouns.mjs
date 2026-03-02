import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

const properNouns = [
  "Pearson", "Spearman", "Kendall", "Fisher", "Cronbach", "Cohen", "Shapiro", "Wilk", "Levene", "Kolmogorov", "Smirnov", "Kruskal", "Wallis", "Mann", "Whitney", "Welch", "Friedman", "Bonferroni", "Tukey", "Scheffe", "Dunn", "Holm", "Bayes", "Bayesiana", "Bayesiano", "Likert", "Guttman", "Rasch", "Thurstone", "Kuder", "Richardson", "ANOVA", "MANOVA", "ANCOVA", "MANCOVA", "JASP", "SPSS", "RStudio", "FACTOR", "R", "ggplot2", "Python", "Excel", "Stata", "SAS", "jamovi", "APA", "IEEE", "McDonald", "Mardia", "Mauchly", "Bartlett", "Student", "Glass", "Hedges", "Bonett", "Satterthwaite", "Box", "Duncan", "Dunnett", "Kaiser", "Meyer", "Olkin", "Cochran", "Yates", "Geisser", "Greenhouse", "PICO", "TRI", "IRaMuTeQ", "teste F", "V de Cramér", "Bland", "Altman", "Poisson", "PEDro", "Physiotherapy Evidence Database", "Fleiss", "Wilcoxon", "Q de Cochran", "U de Mann-Whitney", "SRMR", "RMSEA", "GLMs", "R²", "AMSTAR", "Tipo I", "Tipo II", "Cook", "Curva ROC", "FWER", "EndNote", "Mendeley", "Zotero", "PROCESS", "MIMIC", "HARKing", "SciELO", "Google Acadêmico", "Periódicos CAPES", "Qualis CAPES", "PRISMA", "G*Power", "E-book Análises Bi e Multivariadas: Definições e Usos", "Bessel", "Benjamini-Hochberg", "IA", "SVM", "Goodman-Kruskal", "Yuen", "KR-20", "KR-21", "Q-Q", "Markov", "Matthews", "XGBoost", "Wald-Wolfowitz", "Psicometria Online Academy"
].sort((a, b) => b.length - a.length);

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query("SELECT id, title, content FROM posts WHERE content LIKE '%citation-box%'");
    let updatedCount = 0;

    for (const post of res.rows) {
      let content = post.content;
      let changed = false;

      // 1. Fix using DB title (if title is in citation box)
      const citationTitleMatch = content.match(/<div class="citation-box">.*?<strong>(.*?)<\/strong>/s);
      if (citationTitleMatch) {
        const currentCitationTitle = citationTitleMatch[1];
        if (currentCitationTitle.toLowerCase() === post.title.toLowerCase() && currentCitationTitle !== post.title) {
          content = content.replace(currentCitationTitle, post.title);
          changed = true;
        }
      }

      // 2. Fix using proper nouns list
      for (const noun of properNouns) {
        // Only replace within citation-box
        const boxRegex = /<div class="citation-box">([\s\S]*?)<\/div>/g;
        content = content.replace(boxRegex, (match, boxContent) => {
          const escapedNoun = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nounRegex = new RegExp(`(?<![a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ])${escapedNoun}(?![a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ])`, 'gi');
          
          if (nounRegex.test(boxContent)) {
            const newBoxContent = boxContent.replace(nounRegex, noun);
            if (newBoxContent !== boxContent) {
              changed = true;
              return `<div class="citation-box">${newBoxContent}</div>`;
            }
          }
          return match;
        });
      }

      if (changed) {
        await client.query("UPDATE posts SET content = $1 WHERE id = $2", [content, post.id]);
        updatedCount++;
        console.log(`Updated post: ${post.title}`);
      }
    }

    console.log(`Finished. Total updated posts: ${updatedCount}`);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
