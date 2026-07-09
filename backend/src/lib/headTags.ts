import type { GscConfig } from "./settings.js";

export interface ActiveHeadTag {
  source: "gsc" | "ga4" | "custom";
  kind: string;
  label: string;
  snippet: string;
}

const TAG_RE = /<(meta|link|script)\b[^>]*>/gi;

function tagLabel(tag: string): string {
  const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
  if (name) return name;
  const property = tag.match(/\bproperty=["']([^"']+)["']/i)?.[1];
  if (property) return property;
  const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1];
  if (rel) return rel;
  const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  if (src) return src.slice(0, 80);
  return tag.replace(/\s+/g, " ").slice(0, 80);
}

export function parseHeadTagSnippets(html: string): string[] {
  const tags: string[] = [];
  for (const match of html.matchAll(TAG_RE)) {
    tags.push(match[0].trim());
  }
  return tags;
}

export function buildActiveHeadTags(gsc: GscConfig): ActiveHeadTag[] {
  const tags: ActiveHeadTag[] = [];
  const verification = (gsc.verificationContent ?? "").trim();
  if (verification) {
    tags.push({
      source: "gsc",
      kind: "meta",
      label: "google-site-verification",
      snippet: `<meta name="google-site-verification" content="${verification}" />`,
    });
  }

  const gaId = (gsc.googleAnalyticsId ?? "").trim();
  if (gaId.startsWith("G-")) {
    tags.push({
      source: "ga4",
      kind: "script",
      label: gaId,
      snippet: `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`,
    });
  }

  for (const snippet of parseHeadTagSnippets(gsc.customHeadHtml ?? "")) {
    const kind = snippet.match(/^<(\w+)/i)?.[1]?.toLowerCase() ?? "tag";
    tags.push({
      source: "custom",
      kind,
      label: tagLabel(snippet),
      snippet,
    });
  }

  return tags;
}
