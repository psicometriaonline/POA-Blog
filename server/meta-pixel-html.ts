import { storage } from "./storage";

const PLACEHOLDER = "<!--META_PIXEL_NOSCRIPT-->";

export async function injectMetaPixelNoscript(html: string, urlPath: string): Promise<string> {
  if (!html.includes(PLACEHOLDER)) return html;

  const path = urlPath.split("?")[0];
  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  if (isAdmin) {
    return html.replace(PLACEHOLDER, "");
  }

  try {
    const enabled = await storage.getSetting("meta_pixel_enabled");
    if (enabled === "false") {
      return html.replace(PLACEHOLDER, "");
    }
    const pixelId = (await storage.getSetting("meta_pixel_id"))?.trim();
    if (!pixelId || !/^\d{6,}$/.test(pixelId)) {
      return html.replace(PLACEHOLDER, "");
    }
    const tag = `<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" /></noscript>`;
    return html.replace(PLACEHOLDER, tag);
  } catch {
    return html.replace(PLACEHOLDER, "");
  }
}
