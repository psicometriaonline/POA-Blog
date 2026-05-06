export function setMetaTags(options: {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  robots?: string;
}) {
  if (options.title) {
    document.title = options.title;
    setOrCreateMetaTag("og:title", options.ogTitle || options.title);
    setOrCreateMetaTag("twitter:title", options.ogTitle || options.title);
  }

  if (options.description) {
    setOrCreateMetaTag("description", options.description);
    setOrCreateMetaTag("og:description", options.ogDescription || options.description);
    setOrCreateMetaTag("twitter:description", options.ogDescription || options.description);
  }

  if (options.canonical) {
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = options.canonical;
    setOrCreateMetaTag("og:url", options.ogUrl || options.canonical);
  }

  if (options.ogImage) {
    setOrCreateMetaTag("og:image", options.ogImage);
    setOrCreateMetaTag("twitter:image", options.ogImage);
  }

  if (options.ogUrl) {
    setOrCreateMetaTag("og:url", options.ogUrl);
  }

  if (options.twitterCard) {
    setOrCreateMetaTag("twitter:card", options.twitterCard);
  } else if (options.ogImage) {
    setOrCreateMetaTag("twitter:card", "summary_large_image");
  }

  if (options.robots) {
    setOrCreateMetaTag("robots", options.robots);
  }
}

function setOrCreateMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement;
  if (!tag) {
    tag = document.createElement("meta");
    const isProperty = name.startsWith("og:") || name.startsWith("twitter:") || name.startsWith("article:");
    if (isProperty) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * Replace all <script type="application/ld+json"> blocks with the supplied
 * data array. Accepts a single object (legacy) or an array of objects.
 * Removing existing blocks ensures stale SSR JSON-LD is purged on SPA navigation.
 */
export function setJsonLd(data: any | any[]) {
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
  const list = Array.isArray(data) ? data : [data];
  for (const obj of list) {
    if (!obj) continue;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(obj);
    document.head.appendChild(script);
  }
}
