import type { PublicIpInfo } from "./types.js";
import { vpnLog } from "./logger.js";
import { normalizeCountryCode } from "./countries.js";

const IP_CHECK_TIMEOUT_MS = 12_000;

async function fetchJson(url: string, proxyUrl?: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_CHECK_TIMEOUT_MS);

  try {
    const init: RequestInit = { signal: controller.signal, headers: { Accept: "application/json" } };
    // Node 20+ fetch does not support proxy natively; use direct check unless proxy agent added later.
    // When proxyUrl is set, verification runs through ops script on host or skips deep check in container.
    void proxyUrl;
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function parseIpApi(data: Record<string, unknown>): PublicIpInfo {
  return {
    ipv4: String(data.query ?? data.ip ?? ""),
    countryCode: normalizeCountryCode(String(data.countryCode ?? data.country ?? "")),
    countryName: data.country ? String(data.country) : undefined,
    asn: data.as ? String(data.as) : undefined,
    isp: data.isp ? String(data.isp) : data.org ? String(data.org) : undefined,
    raw: data,
  };
}

/** Query public IP and geolocation from external services. */
export async function getPublicIpInfo(proxyUrl?: string): Promise<PublicIpInfo | null> {
  const endpoints = [
    process.env.IP_CHECK_URL,
    "http://ip-api.com/json/?fields=status,message,country,countryCode,query,isp,as",
    "https://ipinfo.io/json",
  ].filter(Boolean) as string[];

  for (const url of endpoints) {
    try {
      const data = await fetchJson(url, proxyUrl);
      if (data.status === "fail") continue;
      const info = parseIpApi(data);
      if (info.countryCode) {
        vpnLog.info("Public IP verified", {
          country: info.countryCode,
          ipv4: info.ipv4,
          isp: info.isp,
          proxyEnabled: Boolean(proxyUrl),
        });
        return info;
      }
    } catch (err) {
      vpnLog.warn("IP check endpoint failed", { url, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return null;
}

export function countryMatches(expected: string, actual: PublicIpInfo | null | undefined): boolean {
  if (!actual?.countryCode) return false;
  return normalizeCountryCode(expected) === normalizeCountryCode(actual.countryCode);
}
