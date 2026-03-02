import pg from 'pg';
const { Client } = pg;

const properNouns = [
  "Pearson", "Spearman", "Kendall", "Fisher", "Cronbach", "Cohen", "Shapiro", "Wilk", "Levene",
  "Kolmogorov", "Smirnov", "Kruskal", "Wallis", "Mann", "Whitney", "Welch", "Friedman",
  "Bonferroni", "Tukey", "Scheffe", "Dunn", "Holm", "Bayes", "Bayesiana", "Bayesiano",
  "Likert", "Guttman", "Rasch", "Thurstone", "Kuder", "Richardson", "ANOVA", "MANOVA",
  "ANCOVA", "MANCOVA", "JASP", "SPSS", "RStudio", "FACTOR", "R", "ggplot2", "Python",
  "Excel", "Stata", "SAS", "jamovi", "APA", "IEEE", "McDonald", "Mardia", "Mauchly",
  "Bartlett", "Student", "Glass", "Hedges", "Bonett", "Satterthwaite", "Box", "Duncan",
  "Dunnett", "Kaiser", "Meyer", "Olkin", "Cochran", "Yates", "Geisser", "Greenhouse",
  "PICO", "TRI", "IRaMuTeQ", "teste F", "V de Cramér", "Bland", "Altman", "Poisson",
  "PEDro", "Physiotherapy Evidence Database", "Fleiss", "Wilcoxon", "Q de Cochran",
  "U de Mann-Whitney", "SRMR", "RMSEA", "GLMs", "R²", "AMSTAR", "Tipo I", "Tipo II",
  "Cook", "Curva ROC", "FWER", "EndNote", "Mendeley", "Zotero", "PROCESS", "MIMIC",
  "HARKing", "SciELO", "Google Acadêmico", "Periódicos CAPES", "Qualis CAPES", "PRISMA",
  "G*Power", "E-book Análises Bi e Multivariadas: Definições e Usos", "Bessel",
  "Benjamini-Hochberg", "IA", "SVM", "Goodman-Kruskal", "Yuen", "KR-20", "KR-21",
  "Q-Q", "Markov", "Matthews", "XGBoost", "Wald-Wolfowitz", "Psicometria Online Academy"
].sort((a, b) => b.length - a.length);

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database");

  const res = await client.query("SELECT id, title, content FROM posts WHERE content LIKE '%citation-box%'");
  console.log(`Found ${res.rows.length} posts with citation boxes`);

  let updatedCount = 0;

  for (const post of res.rows) {
    let newContent = post.content;
    const citationRegex = /<div class="citation-box">([\s\S]*?)<\/div>/g;
    
    newContent = newContent.replace(citationRegex, (match, p1) => {
      let inner = p1;
      
      // 1. Try to fix the title part (usually before the first dot or comma)
      // Citations usually start with "Como citar: Titulo do Post. ..."
      const titleMatch = inner.match(/Como citar: (.*?)[.,]/);
      if (titleMatch) {
        const oldTitlePart = titleMatch[1];
        inner = inner.replace(oldTitlePart, post.title);
      }

      // 2. Apply proper nouns list for everything else in the box
      for (const noun of properNouns) {
        const escapedNoun = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zA-ZÀ-ÿ])${escapedNoun}(?![a-zA-ZÀ-ÿ])`, 'gi');
        inner = inner.replace(regex, noun);
      }
      
      return `<div class="citation-box">${inner}</div>`;
    });

    if (newContent !== post.content) {
      await client.query("UPDATE posts SET content = $1 WHERE id = $2", [newContent, post.id]);
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} posts`);
  await client.end();
}

run().catch(console.error);
