import { useEffect } from "react";
import { useConfig, useSite } from "@/lib/ConfigContext";

interface SeoProps {
  title: string;
  description: string;
  /** path beginning with "/" */
  path: string;
  keywords?: string[];
  /** one or more JSON-LD objects */
  jsonLd?: object | object[];
  noindex?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function absoluteAsset(siteUrl: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/")) {
    const apiBase = import.meta.env.VITE_API_BASE ?? "";
    if (apiBase) return `${apiBase.replace(/\/$/, "")}${path}`;
  }
  return `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function Seo({ title, description, path, keywords, jsonLd, noindex }: SeoProps) {
  const site = useSite();
  const { config } = useConfig();
  const override = config?.routeSeo?.find((entry) => entry.path === path);
  const finalTitle = override?.title?.trim() || title;
  const finalDescription = override?.description?.trim() || description;
  const finalKeywords = override?.keywords?.length ? override.keywords : keywords;
  const finalNoindex = override?.noindex ?? noindex;

  useEffect(() => {
    // Format: "TinyDown - Youtube Video Downloader"  (site name prefix)
    const fullTitle = finalTitle.includes(site.name)
      ? finalTitle
      : `${site.name} - ${finalTitle}`;
    const url = `${site.url.replace(/\/$/, "")}${path}`;
    const image = absoluteAsset(site.url, site.ogImage);

    document.title = fullTitle;
    upsertMeta("name", "description", finalDescription);
    if (finalKeywords?.length) upsertMeta("name", "keywords", finalKeywords.join(", "));
    upsertMeta("name", "robots", finalNoindex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", url);

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", url);
    if (image) upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", site.name);
    upsertMeta("property", "og:locale", site.locale || "en_US");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", finalDescription);
    if (image) upsertMeta("name", "twitter:image", image);
    if (site.twitter) upsertMeta("name", "twitter:site", site.twitter);

    const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    const scriptEls: HTMLScriptElement[] = [];
    blocks.forEach((block) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "true";
      script.text = JSON.stringify(block);
      document.head.appendChild(script);
      scriptEls.push(script);
    });

    return () => {
      scriptEls.forEach((s) => s.remove());
    };
  }, [finalTitle, finalDescription, path, finalKeywords, jsonLd, finalNoindex, site]);

  return null;
}
