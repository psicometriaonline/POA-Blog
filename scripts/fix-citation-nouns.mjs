import pg from 'pg';

const properNouns = [
  'Pearson', 'Spearman', 'Kendall', 'Fisher', 'Cronbach', 'Cohen', 'Shapiro', 'Wilk',
  'Levene', 'Kolmogorov', 'Smirnov', 'Kruskal', 'Wallis', 'Mann', 'Whitney', 'Welch',
  'Friedman', 'Bonferroni', 'Tukey', 'Scheffe', 'Dunn', 'Holm', 'Bayes', 'Bayesiana',
  'Bayesiano', 'Likert', 'Guttman', 'Rasch', 'Thurstone', 'Kuder', 'Richardson',
  'ANOVA', 'MANOVA', 'ANCOVA', 'MANCOVA', 'JASP', 'SPSS', 'RStudio', 'FACTOR', 'R',
  'ggplot2', 'Python', 'Excel', 'Stata', 'SAS', 'jamovi', 'APA', 'IEEE', 'McDonald', 'Mardia',
  'Mauchly', 'Bartlett', 'Student', 'Glass', 'Hedges', 'Bonett', 'Satterthwaite', 'Box',
  'Duncan', 'Dunnett', 'Kaiser', 'Meyer', 'Olkin', 'Cochran', 'Yates', 'Geisser', 'Greenhouse',
  'PICO', 'TRI', 'IRaMuTeQ', 'Bland', 'Altman', 'Poisson', 'PEDro',
  'Physiotherapy Evidence Database', 'Fleiss', 'Wilcoxon',
  'SRMR', 'RMSEA', 'GLMs', 'AMSTAR', 'Cook', 'FWER',
  'EndNote', 'Mendeley', 'Zotero', 'PROCESS', 'MIMIC', 'HARKing', 'SciELO',
  'PRISMA', 'Bessel', 'Benjamini-Hochberg', 'SVM', 'Goodman-Kruskal', 'Yuen',
  'KR-20', 'KR-21', 'Markov', 'Matthews', 'XGBoost', 'Wald-Wolfowitz',
  'Psicometria Online Academy',
  'Google Acadêmico', 'Periódicos CAPES', 'Qualis CAPES',
  'Curva ROC', 'Tipo I', 'Tipo II',
  'Q de Cochran', 'U de Mann-Whitney', 'V de Cramér', 'teste F',
  'G*Power', 'R²', 'Q-Q', 'IA',
  'E-book Análises Bi e Multivariadas: Definições e Usos',
];

properNouns.sort((a, b) => b.length - a.length);

function escapeRegex(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query("SELECT id, title, content FROM posts WHERE content LIKE '%citation-box%'");
  console.log(`Found ${res.rows.length} posts with citation boxes.`);

  let updatedCount = 0;

  for (const post of res.rows) {
    let content = post.content;
    let changed = false;

    content = content.replace(/<div class="citation-box">([\s\S]*?)<\/div>/g, (_match, inner) => {
      let fixed = inner;

      const titleMatch = fixed.match(/\)\.\s+(.*?)\s+<em>/i);
      if (titleMatch && post.title) {
        const citTitle = titleMatch[1];
        const dbTitleClean = post.title.trim().replace(/\?$/, '');
        const citTitleClean = citTitle.trim().replace(/\.$/, '').replace(/\?$/, '');

        if (dbTitleClean.toLowerCase() === citTitleClean.toLowerCase()) {
          const suffix = citTitle.endsWith('?') ? '?' : '.';
          fixed = fixed.replace(citTitle, dbTitleClean + suffix);
        }
      }

      for (const noun of properNouns) {
        const escaped = escapeRegex(noun);
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        fixed = fixed.replace(regex, noun);
      }

      if (fixed !== inner) {
        changed = true;
        return `<div class="citation-box">${fixed}</div>`;
      }
      return _match;
    });

    if (changed) {
      await client.query('UPDATE posts SET content = $1 WHERE id = $2', [content, post.id]);
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} posts.`);

  const verifySlugs = [
    'o-que-e-correlacao-de-pearson',
    'o-que-e-correlacao-de-spearman',
    'analise-textual-o-software-iramuteq',
    'support-vector-machine-entenda-o-algoritmo-svm',
    'teste-de-esfericidade-de-mauchly',
    'd-de-cohen',
  ];

  console.log('\n--- Verification ---');
  for (const slug of verifySlugs) {
    const v = await client.query('SELECT title, content FROM posts WHERE slug = $1', [slug]);
    if (v.rows.length > 0) {
      const m = v.rows[0].content.match(/<div class="citation-box">([\s\S]*?)<\/div>/);
      if (m) {
        const titlePart = m[1].match(/\)\.\s+(.*?)\s+<em>/i);
        console.log(`[${slug}]`);
        console.log(`  DB title: ${v.rows[0].title}`);
        console.log(`  Citation title: ${titlePart ? titlePart[1] : 'N/A'}`);
      }
    } else {
      console.log(`[${slug}] NOT FOUND`);
    }
  }

  await client.end();
}

main().catch(console.error);
