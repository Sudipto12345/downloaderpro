import { config } from "../config.js";
import { getSetting, setSetting } from "./settings.js";

export interface CountryProxy {
  country: string;
  label: string;
  proxy: string;
  enabled: boolean;
}

export interface YtdlpGeoConfig {
  geoBypass: boolean;
  /** Primary country for --xff (ISO 3166-1 alpha-2) */
  defaultCountry: string;
  /** Fallback proxy when no country-specific proxy matches */
  proxy: string;
  cookiesFile: string;
  /** Per-country proxy routes for region-locked content */
  countryProxies: CountryProxy[];
}

const DEFAULT_GEO: YtdlpGeoConfig = {
  geoBypass: true,
  defaultCountry: "BD",
  proxy: "",
  cookiesFile: "",
  countryProxies: [
    { country: "BD", label: "Bangladesh", proxy: "", enabled: true },
    { country: "US", label: "United States", proxy: "", enabled: true },
    { country: "GB", label: "United Kingdom", proxy: "", enabled: true },
    { country: "IN", label: "India", proxy: "", enabled: true },
  ],
};

let cache: { value: YtdlpGeoConfig; at: number } | null = null;
const CACHE_MS = 15_000;

export async function getYtdlpGeoConfig(): Promise<YtdlpGeoConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const fromDb = await getSetting<Partial<YtdlpGeoConfig>>("ytdlpGeo", DEFAULT_GEO);
  const merged: YtdlpGeoConfig = {
    geoBypass: fromDb.geoBypass ?? config.ytdlp.geoBypass,
    defaultCountry: (fromDb.defaultCountry || config.ytdlp.geoBypassCountry || "BD").toUpperCase(),
    proxy: fromDb.proxy ?? config.ytdlp.proxy ?? "",
    cookiesFile: fromDb.cookiesFile ?? config.ytdlp.cookiesFile ?? "",
    countryProxies: fromDb.countryProxies?.length ? fromDb.countryProxies : DEFAULT_GEO.countryProxies,
  };

  cache = { value: merged, at: Date.now() };
  return merged;
}

export async function setYtdlpGeoConfig(data: YtdlpGeoConfig): Promise<void> {
  await setSetting("ytdlpGeo", {
    ...data,
    defaultCountry: data.defaultCountry.toUpperCase(),
    countryProxies: data.countryProxies.map((c) => ({
      ...c,
      country: c.country.toUpperCase(),
    })),
  });
  cache = null;
}

export function invalidateYtdlpGeoCache(): void {
  cache = null;
}

/** Resolve proxy URL for a given country (enabled entry > default proxy > env). */
export function resolveProxyForCountry(geo: YtdlpGeoConfig, country?: string): string {
  const code = (country ?? geo.defaultCountry).toUpperCase();
  const entry = geo.countryProxies.find((c) => c.country === code && c.enabled && c.proxy.trim());
  if (entry) return entry.proxy.trim();
  return geo.proxy.trim();
}
