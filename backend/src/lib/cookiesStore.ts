import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import { isInstagramUrl } from "./platforms.js";

const DATA_DIR = join(process.cwd(), "data");

export const INSTAGRAM_COOKIES_PATH = join(DATA_DIR, "instagram-cookies.txt");

export function instagramCookiesConfigured(): boolean {
  return existsSync(INSTAGRAM_COOKIES_PATH);
}

export function generalCookiesConfigured(path?: string): boolean {
  const p = (path ?? config.ytdlp.cookiesFile).trim();
  return Boolean(p && existsSync(p));
}

/** Persist Netscape-format Instagram session cookies (export from a logged-in browser). */
export async function saveInstagramCookies(content: string): Promise<void> {
  const trimmed = content.trim();
  if (trimmed.length < 32) {
    throw new Error("Cookies file is too short.");
  }
  if (!/instagram\.com/i.test(trimmed)) {
    throw new Error("This file does not contain instagram.com cookies.");
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INSTAGRAM_COOKIES_PATH, trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`, {
    mode: 0o600,
  });
}

/** Pick the best cookies file for a given media URL. */
export function resolveCookiesPath(url: string | undefined, geoCookiesFile: string): string | null {
  const candidates: string[] = [];
  if (isInstagramUrl(url ?? "")) {
    candidates.push(INSTAGRAM_COOKIES_PATH, geoCookiesFile.trim(), config.ytdlp.cookiesFile.trim());
  } else {
    candidates.push(geoCookiesFile.trim(), config.ytdlp.cookiesFile.trim(), INSTAGRAM_COOKIES_PATH);
  }
  for (const path of candidates) {
    if (path && existsSync(path)) return path;
  }
  return null;
}
