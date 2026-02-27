const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const months = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

function formatPart(str) {
  if (!str) return "";
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatCitation(authorName, title, publishedAt, slug) {
  if (!authorName || !publishedAt) return null;
  
  const nameParts = authorName.trim().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1];
  const firstNameInitial = nameParts[0].charAt(0);
  
  const date = new Date(publishedAt);
  const year = date.getFullYear();
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  let formattedTitle = title.trim();
  if (formattedTitle.includes(':')) {
    const parts = formattedTitle.split(':');
    const main = formatPart(parts[0]);
    const sub = formatPart(parts.slice(1).join(':'));
    formattedTitle = main + ": " + sub;
  } else {
    formattedTitle = formatPart(formattedTitle);
  }
  
  const url = "https://www.blog.psicometriaonline.com.br/" + slug;
  
  return lastName + ", " + firstNameInitial + ". (" + year + ", " + day + " de " + month + "). " + formattedTitle + ". <em>Blog Psicometria Online</em>. " + url;
}

async function run() {
  const { rows } = await pool.query('SELECT p.id, p.title, p.slug, p.published_at as "publishedAt", p.content, a.name as "authorName" FROM posts p LEFT JOIN authors a ON p.author_id = a.id WHERE p.status = \'published\'');
  
  console.log("Processing " + rows.length + " posts...");
  
  for (const post of rows) {
    const citationText = formatCitation(post.authorName, post.title, post.publishedAt, post.slug);
    if (!citationText) continue;
    
    let content = post.content;
    const newCitationHtml = '<div class="citation-box"><p>' + citationText + '</p></div>';
    
    if (content.includes('class="citation-box"')) {
      content = content.replace(/<div class="citation-box">[\s\S]*?<\/div>/, newCitationHtml);
    } else {
      const headingRegex = /(<h2[^>]*>[\s\S]*?Como\s+citar[\s\S]*?<\/h2>)/i;
      if (headingRegex.test(content)) {
        content = content.replace(headingRegex, "$1\n" + newCitationHtml);
      }
    }
    
    await pool.query('UPDATE posts SET content = $1 WHERE id = $2', [content, post.id]);
  }
  
  console.log("Done.");
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
