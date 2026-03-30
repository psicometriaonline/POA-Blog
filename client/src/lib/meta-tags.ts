export function setMetaTags(options: {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
}) {
  // Title
  if (options.title) {
    document.title = options.title;
    setOrCreateMetaTag("og:title", options.ogTitle || options.title);
    setOrCreateMetaTag("twitter:title", options.ogTitle || options.title);
  }

  // Description
  if (options.description) {
    setOrCreateMetaTag("description", options.description);
    setOrCreateMetaTag("og:description", options.ogDescription || options.description);
    setOrCreateMetaTag("twitter:description", options.ogDescription || options.description);
  }

  // Canonical
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

  // Open Graph
  if (options.ogImage) {
    setOrCreateMetaTag("og:image", options.ogImage);
    setOrCreateMetaTag("twitter:image", options.ogImage);
  }

  if (options.ogUrl) {
    setOrCreateMetaTag("og:url", options.ogUrl);
  }

  // Twitter Card
  if (options.twitterCard) {
    setOrCreateMetaTag("twitter:card", options.twitterCard);
  } else if (options.ogImage) {
    setOrCreateMetaTag("twitter:card", "summary_large_image");
  }
}

function setOrCreateMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement;
  if (!tag) {
    tag = document.createElement("meta");
    const isProperty = name.startsWith("og:") || name.startsWith("twitter:");
    if (isProperty) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export function setJsonLd(data: any) {
  let script = document.querySelector("script[type='application/ld+json']") as HTMLScriptElement;
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
