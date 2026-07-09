import { config } from "../config.js";
import { getYtdlpGeoConfig, resolveProxyForCountry } from "./ytdlpConfig.js";
import { getVpnManager, normalizeCountryCode } from "../vpn/index.js";
import { isProxyReachable, clearProxyHealthCache } from "./proxyHealth.js";
import { resolveCookiesPath } from "./cookiesStore.js";
import { isInstagramUrl } from "./platforms.js";
import type { NetworkRoute } from "../vpn/types.js";

let cachedRoute: { key: string; route: NetworkRoute; at: number } | null = null;
const ROUTE_CACHE_MS = 15_000;

async function usableProxy(url: string): Promise<string> {
  if (!url.trim()) return "";
  return (await isProxyReachable(url)) ? url.trim() : "";
}

/** Direct route for public videos — no proxy unless it is reachable. */
async function resolveDirectRoute(): Promise<NetworkRoute> {
  const geo = await getYtdlpGeoConfig();
  const dbProxy = resolveProxyForCountry(geo, geo.defaultCountry);
  const envProxy = config.ytdlp.proxy;
  const candidate = dbProxy || envProxy;
  const proxyUrl = await usableProxy(candidate);

  return {
    country: "",
    proxyUrl,
    providerId: "http-proxy",
    xffCountry: "",
    geoBypass: geo.geoBypass,
  };
}

/**
 * Resolves network route for yt-dlp.
 * Public downloads use direct VPS connection; geo retries pass countryOverride.
 */
export async function resolveNetworkRoute(countryOverride?: string): Promise<NetworkRoute> {
  if (!countryOverride) {
    const cacheKey = "direct";
    if (cachedRoute && cachedRoute.key === cacheKey && Date.now() - cachedRoute.at < ROUTE_CACHE_MS) {
      return cachedRoute.route;
    }
    const route = await resolveDirectRoute();
    cachedRoute = { key: cacheKey, route, at: Date.now() };
    return route;
  }

  const country = normalizeCountryCode(countryOverride);
  const cacheKey = `geo:${country}`;
  if (cachedRoute && cachedRoute.key === cacheKey && Date.now() - cachedRoute.at < ROUTE_CACHE_MS) {
    return cachedRoute.route;
  }

  const route = await getVpnManager().acquireRoute(country);
  if (route.proxyUrl && !(await isProxyReachable(route.proxyUrl))) {
    route.proxyUrl = "";
  }
  cachedRoute = { key: cacheKey, route, at: Date.now() };
  return route;
}

/** Build yt-dlp CLI network arguments from resolved route + config. */
export async function buildNetworkArgs(countryOverride?: string, url?: string): Promise<string[]> {
  const geo = await getYtdlpGeoConfig();
  const route = await resolveNetworkRoute(countryOverride);
  const instagram = isInstagramUrl(url ?? "");
  const useProxy = Boolean(route.proxyUrl) && !(instagram && !countryOverride);

  const args: string[] = [
    "--socket-timeout",
    String(config.ytdlp.timeout),
    "--retries",
    String(config.ytdlp.retries),
    "--fragment-retries",
    String(config.ytdlp.retries),
  ];

  if (useProxy) {
    args.push("--proxy", route.proxyUrl);
    const xff = countryOverride ? normalizeCountryCode(countryOverride) : route.xffCountry;
    if (xff) args.push("--xff", xff);
  } else if (countryOverride) {
    const xff = normalizeCountryCode(countryOverride);
    if (xff) args.push("--xff", xff);
    else if (geo.geoBypass) args.push("--geo-bypass");
  } else if (geo.geoBypass && !instagram) {
    args.push("--geo-bypass");
  }

  const cookies = resolveCookiesPath(url, geo.cookiesFile);
  if (cookies) {
    args.push("--cookies", cookies);
  }

  return args;
}

export function invalidateNetworkRouteCache(): void {
  cachedRoute = null;
  clearProxyHealthCache();
}
