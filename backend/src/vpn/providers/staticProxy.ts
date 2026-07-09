import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { ProviderConnectResult, ProviderHealth, VpnConnection, VpnProviderConfig } from "../types.js";
import { BaseVpnProvider } from "./base.js";
import { getPublicIpInfo, countryMatches } from "../ipVerify.js";
import { config } from "../../config.js";
import { normalizeCountryCode } from "../countries.js";

interface ProxyEntry {
  country: string;
  scheme: "http" | "https" | "socks5";
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

function loadProxyConfig(): ProxyEntry[] {
  const paths = [
    process.env.VPN_PROXY_CONFIG,
    "/etc/downloaderpro/proxy.json",
    resolve(process.cwd(), "../ops/config/proxy.json"),
    resolve(process.cwd(), "ops/config/proxy.json"),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, "utf8"));
        return Array.isArray(data.proxies) ? data.proxies : [];
      } catch {
        /* continue */
      }
    }
  }
  return [];
}

function buildProxyUrl(entry: ProxyEntry): string {
  const auth =
    entry.username && entry.password
      ? `${encodeURIComponent(entry.username)}:${encodeURIComponent(entry.password)}@`
      : "";
  return `${entry.scheme}://${auth}${entry.host}:${entry.port}`;
}

export abstract class StaticProxyProvider extends BaseVpnProvider {
  protected abstract readonly scheme: "http" | "https" | "socks5";

  supportsCountry(country: string): boolean {
    const code = normalizeCountryCode(country);
    const entries = loadProxyConfig().filter((e) => e.enabled !== false && e.scheme === this.scheme);
    if (entries.some((e) => normalizeCountryCode(e.country) === code)) return true;
    // Env fallback supports any country when YTDLP_PROXY matches scheme
    const envProxy = config.ytdlp.proxy;
    return Boolean(envProxy && envProxy.startsWith(`${this.scheme}://`));
  }

  isConfigured(): boolean {
    const envProxy = config.ytdlp.proxy;
    if (this.scheme === "http" && (envProxy.startsWith("http://") || envProxy.startsWith("https://"))) return true;
    if (envProxy.startsWith(`${this.scheme}://`)) return true;
    return loadProxyConfig().some((e) => e.enabled !== false && e.scheme === this.scheme);
  }

  private resolveProxy(country: string): string {
    const code = normalizeCountryCode(country);
    const entry = loadProxyConfig().find(
      (e) => e.enabled !== false && e.scheme === this.scheme && normalizeCountryCode(e.country) === code
    );
    if (entry) return buildProxyUrl(entry);
    const envProxy = config.ytdlp.proxy;
    if (this.scheme === "http" && (envProxy.startsWith("http://") || envProxy.startsWith("https://"))) return envProxy;
    if (envProxy.startsWith(`${this.scheme}://`)) return envProxy;
    return "";
  }

  async connect(country: string): Promise<ProviderConnectResult> {
    const proxyUrl = this.resolveProxy(country);
    if (!proxyUrl) return { connection: null, proxyUrl: "", error: `No ${this.scheme} proxy for ${country}` };

    const connection: VpnConnection = {
      id: randomUUID(),
      providerId: this.id,
      country: normalizeCountryCode(country),
      proxyUrl,
      connectedAt: Date.now(),
    };
    return { connection, proxyUrl };
  }

  async disconnect(_connection: VpnConnection): Promise<void> {
    /* Stateless proxy — nothing to tear down */
  }

  async healthCheck(expectedCountry?: string): Promise<ProviderHealth> {
    const proxyUrl = config.ytdlp.proxy;
    const ip = await getPublicIpInfo(proxyUrl);
    return {
      providerId: this.id,
      ok: this.isConfigured(),
      authenticated: true,
      connected: Boolean(proxyUrl),
      internet: Boolean(ip),
      dns: Boolean(ip),
      proxyAlive: this.isConfigured(),
      countryMatch: expectedCountry ? countryMatches(expectedCountry, ip) : true,
      bandwidthOk: true,
      publicIp: ip ?? undefined,
    };
  }
}

export class HttpProxyProvider extends StaticProxyProvider {
  readonly id = "http-proxy" as const;
  readonly priority = 7;
  protected readonly scheme = "http" as const;
}

export class Socks5ProxyProvider extends StaticProxyProvider {
  readonly id = "socks5-proxy" as const;
  readonly priority = 8;
  protected readonly scheme = "socks5" as const;
}

/** Commercial VPN CLI adapter — delegates to ops connect-country.sh with provider id. */
export function createCommercialVpnProvider(
  id: import("../types.js").VpnProviderId,
  priority: number,
  credentialEnvVars: string[],
  supportedCountries: string[] | "all"
): BaseVpnProvider {
  return new (class extends BaseVpnProvider {
    readonly id = id;
    readonly priority = priority;

    supportsCountry(country: string): boolean {
      if (supportedCountries === "all") return true;
      return supportedCountries.includes(normalizeCountryCode(country));
    }

    isConfigured(): boolean {
      return credentialEnvVars.some((k) => Boolean(process.env[k]?.trim()));
    }

    async connect(country: string): Promise<ProviderConnectResult> {
      if (!this.isConfigured()) return this.missingCredentials();
      const { runOpsScript } = await import("./hostTunnel.js");
      const result = await runOpsScript("connect-country.sh", [normalizeCountryCode(country), id]);
      if (!result.ok) return { connection: null, proxyUrl: "", error: result.stderr };

      const proxyUrl =
        result.stdout.split("\n").find((l) => l.startsWith("PROXY="))?.slice(6) ??
        config.vpn.localProxyUrl ??
        "";

      if (!proxyUrl) return { connection: null, proxyUrl: "", error: "No proxy from commercial VPN connect" };

      return {
        connection: {
          id: randomUUID(),
          providerId: id,
          country: normalizeCountryCode(country),
          proxyUrl,
          connectedAt: Date.now(),
        },
        proxyUrl,
      };
    }

    async disconnect(connection: VpnConnection): Promise<void> {
      const { runOpsScript } = await import("./hostTunnel.js");
      await runOpsScript("disconnect-vpn.sh", [connection.country, id]);
    }

    async healthCheck(expectedCountry?: string): Promise<ProviderHealth> {
      const ip = await getPublicIpInfo(config.vpn.localProxyUrl);
      return {
        providerId: id,
        ok: this.isConfigured() && Boolean(ip),
        authenticated: this.isConfigured(),
        connected: Boolean(config.vpn.localProxyUrl),
        internet: Boolean(ip),
        dns: Boolean(ip),
        proxyAlive: Boolean(config.vpn.localProxyUrl),
        countryMatch: expectedCountry ? countryMatches(expectedCountry, ip) : true,
        bandwidthOk: true,
        publicIp: ip ?? undefined,
      };
    }
  })();
}

export function loadProviderConfigs(): VpnProviderConfig[] {
  const paths = [
    process.env.VPN_PROVIDERS_FILE,
    "/etc/downloaderpro/vpn.providers.json",
    resolve(process.cwd(), "../ops/config/vpn.providers.json"),
    resolve(process.cwd(), "ops/config/vpn.providers.json"),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, "utf8"));
        return Array.isArray(data.providers) ? data.providers : [];
      } catch {
        /* continue */
      }
    }
  }
  return [];
}
