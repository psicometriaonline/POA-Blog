import pg from 'pg';
const { Client } = pg;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const slugs = [
    'o-que-e-correlacao-de-pearson',
    'o-que-e-correlacao-de-spearman',
    'analise-textual-o-software-iramuteq',
    'support-vector-machine-entenda-o-algoritmo-svm',
    'teste-de-esfericidade-de-mauchly'
  ];

  for (const slug of slugs) {
    const res = await client.query("SELECT title, content FROM posts WHERE slug = $1", [slug]);
    if (res.rows.length > 0) {
      const post = res.rows[0];
      const citationMatch = post.content.match(/<div class="citation-box">([\s\S]*?)<\/div>/);
      console.log(`\nPost: ${slug}`);
      console.log(`Title: ${post.title}`);
      if (citationMatch) {
        console.log(`Citation Content: ${citationMatch[1].trim()}`);
      } else {
        console.log("No citation box found.");
      }
    } else {
      console.log(`Post not found: ${slug}`);
    }
  }
  await client.end();
}
run().catch(console.error);
