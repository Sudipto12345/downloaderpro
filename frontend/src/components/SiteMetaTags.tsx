import { useEffect } from "react";
import { useConfig } from "@/lib/ConfigContext";

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function injectCustomHeadHtml(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  const injected: HTMLElement[] = [];

  for (const node of Array.from(container.querySelectorAll("meta, link, script"))) {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute("data-site-injected", "true");
    document.head.appendChild(clone);
    injected.push(clone);
  }

  return () => {
    for (const node of injected) {
      node.remove();
    }
  };
}

/** Injects Google Search Console verification, optional GA4, and custom head HTML from DB config. */
export function SiteMetaTags() {
  const { config } = useConfig();
  const gsc = config.gsc;

  useEffect(() => {
    if (gsc?.verificationContent) {
      upsertMeta("google-site-verification", gsc.verificationContent);
    }
  }, [gsc?.verificationContent]);

  useEffect(() => {
    const html = gsc?.customHeadHtml?.trim();
    if (!html) return;
    return injectCustomHeadHtml(html);
  }, [gsc?.customHeadHtml]);

  useEffect(() => {
    const id = gsc?.googleAnalyticsId?.trim();
    if (!id || !id.startsWith("G-")) return;

    const existing = document.getElementById("ga4-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "ga4-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.id = "ga4-inline";
    inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
    document.head.appendChild(inline);

    return () => {
      document.getElementById("ga4-script")?.remove();
      document.getElementById("ga4-inline")?.remove();
    };
  }, [gsc?.googleAnalyticsId]);

  return null;
}
