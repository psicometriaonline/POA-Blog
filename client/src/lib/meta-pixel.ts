declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

const state = {
  enabled: false,
  activePixelId: null as string | null,
  scriptLoaded: false,
};

export function setPixelEnabled(enabled: boolean) {
  state.enabled = enabled;
}

export function isPixelActive(): boolean {
  return state.enabled && !!state.activePixelId && typeof window !== "undefined" && !!window.fbq;
}

export function initMetaPixel(pixelId: string) {
  if (typeof window === "undefined") return;

  if (state.activePixelId && state.activePixelId !== pixelId) {
    console.warn(
      "[Meta Pixel] ID changed from",
      state.activePixelId,
      "to",
      pixelId,
      "- a full page reload is required to switch IDs."
    );
    return;
  }

  if (state.activePixelId === pixelId) return;

  if (!state.scriptLoaded && !window.fbq) {
    (function (f: any, b: Document, e: string, v: string) {
      let n: any;
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode?.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    state.scriptLoaded = true;
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  state.activePixelId = pixelId;
}

export function trackEvent(event: string, params?: Record<string, any>) {
  if (!isPixelActive()) return;
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) {
    window.fbq("track", event, params);
  } else {
    window.fbq("track", event);
  }
}

export function trackPageView() {
  if (!isPixelActive()) return;
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView");
}
