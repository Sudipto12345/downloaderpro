import { connect } from "node:net";

const CACHE_MS = 15_000;
const cache = new Map<string, { ok: boolean; at: number }>();

/** Quick TCP check — skip dead proxies so public downloads work without tunnel. */
export async function isProxyReachable(proxyUrl: string): Promise<boolean> {
  const url = proxyUrl.trim();
  if (!url) return false;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ok;

  let ok = false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 1080));
    ok = await new Promise<boolean>((resolve) => {
      const sock = connect({ host, port, timeout: 2500 });
      sock.on("connect", () => {
        sock.destroy();
        resolve(true);
      });
      sock.on("error", () => resolve(false));
      sock.on("timeout", () => {
        sock.destroy();
        resolve(false);
      });
    });
  } catch {
    ok = false;
  }

  cache.set(url, { ok, at: Date.now() });
  return ok;
}

export function clearProxyHealthCache(): void {
  cache.clear();
}
