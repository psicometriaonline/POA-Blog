import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const existing = await client.query("SELECT id, title, sort_order FROM banners WHERE slot = 'sidebar' ORDER BY sort_order");
console.log("Existing sidebar banners:", existing.rows);

const nextOrder = existing.rows.length;
const res = await client.query(
  `INSERT INTO banners (title, image_url, link_url, slot, is_active, sort_order, show_button, title_alignment, title_font_size, button_font_size, show_title, button_pos_x, button_pos_y)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
  ["Psicometria Online Academy", "/uploads/psicometria_online_negativopng_1771733729541.png", "https://academy.psicometriaonline.com.br/blog", "sidebar", true, nextOrder, false, "left", 18, 14, false, 0, 0]
);
console.log("Created banner with id:", res.rows[0].id);

const check = await client.query("SELECT id, title, sort_order FROM banners WHERE slot = 'sidebar' ORDER BY sort_order");
console.log("All sidebar banners now:", check.rows);

await client.end();
