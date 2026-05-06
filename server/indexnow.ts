import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || "https://www.blog.psicometriaonline.com.br";
const SITE_HOST = new URL(SITE_URL).hostname;

export async function getOrCreateIndexNowKey(): Promise<string> {
  let key = (await storage.getSetting("indexnow_key"))?.trim();
  if (!key || key.length < 8) {
    key = generateKey();
    await storage.setSetting("indexnow_key", key);
  }
  return key;
}

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!urls.length) return;
  try {
    const key = await getOrCreateIndexNowKey();
    const body = {
      host: SITE_HOST,
      key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList: urls,
    };
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[indexnow] ping failed: ${res.status} ${res.statusText}`);
    } else {
      console.log(`[indexnow] pinged ${urls.length} URL(s) — ${res.status}`);
    }
  } catch (err) {
    console.warn("[indexnow] ping error:", err);
  }
}

export async function pingGoogleSitemap(): Promise<void> {
  try {
    const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITE_URL + "/sitemap.xml")}`);
    if (res.ok) console.log("[google-ping] sitemap submitted");
  } catch (err) {
    console.warn("[google-ping] error:", err);
  }
}

export async function notifySearchEngines(urls: string[]): Promise<void> {
  // Fire-and-forget; don't block request handlers.
  void pingIndexNow(urls);
  void pingGoogleSitemap();
}
