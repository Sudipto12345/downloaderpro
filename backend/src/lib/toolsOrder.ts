import { getSetting, setSetting } from "./settings.js";

/** Default tool slug order (matches frontend tools.ts). */
export const DEFAULT_TOOL_SLUGS = [
  "youtube-downloader",
  "tiktok-downloader",
  "instagram-downloader",
  "facebook-downloader",
  "twitter-downloader",
  "video-downloader",
];

export async function getToolOrder(): Promise<string[]> {
  const raw = await getSetting<string[]>("toolOrder", DEFAULT_TOOL_SLUGS);
  if (!Array.isArray(raw) || !raw.length) return [...DEFAULT_TOOL_SLUGS];
  return raw;
}

export async function setToolOrder(slugs: string[]): Promise<string[]> {
  const cleaned = slugs.filter((s) => typeof s === "string" && s.trim().length > 0);
  const order = cleaned.length ? cleaned : [...DEFAULT_TOOL_SLUGS];
  await setSetting("toolOrder", order);
  return order;
}
