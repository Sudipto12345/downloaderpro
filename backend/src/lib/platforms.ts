export function isInstagramUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch {
    return /instagram\.com/i.test(url);
  }
}
