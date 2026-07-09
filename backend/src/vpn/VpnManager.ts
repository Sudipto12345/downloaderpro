import { randomUUID } from "node:crypto";
import type { NetworkRoute, VpnConnection, VpnProviderId } from "./types.js";
import { getProviderRegistry, getProviderById } from "./providers/registry.js";
import { getPublicIpInfo, countryMatches } from "./ipVerify.js";
import { normalizeCountryCode } from "./countries.js";
import { vpnLog } from "./logger.js";
import { config } from "../config.js";
import { getYtdlpGeoConfig, resolveProxyForCountry } from "../lib/ytdlpConfig.js";
import { invalidateNetworkRouteCache } from "../lib/networkRoute.js";

const activeConnections = new Map<string, VpnConnection>();

export class VpnManager {
  private readonly maxProviderAttempts = Number(process.env.VPN_MAX_PROVIDER_ATTEMPTS ?? 5);

  /** Resolve network route for yt-dlp with automatic provider failover. */
  async acquireRoute(requestedCountry?: string): Promise<NetworkRoute> {
    const geo = await getYtdlpGeoConfig();
    const country = normalizeCountryCode(
      requestedCountry || config.vpn.country || geo.defaultCountry || "BD"
    );

    const dbProxy = resolveProxyForCountry(geo, country);
    const envProxy = config.ytdlp.proxy;
    const explicitProvider = config.vpn.provider;

    vpnLog.info("Acquiring network route", {
      country,
      vpnProvider: explicitProvider,
      dbProxyEnabled: Boolean(dbProxy),
      envProxyEnabled: Boolean(envProxy),
    });

    // Direct env/DB proxy without VPN framework when VPN_PROVIDER=none
    if (explicitProvider === "none") {
      const proxyUrl = dbProxy || envProxy;
      return this.buildRoute(country, proxyUrl, geo.geoBypass, "http-proxy");
    }

    const providers = this.selectProviders(explicitProvider, country);
    const tried = new Set<VpnProviderId>();
    let lastError = "";

    for (const provider of providers) {
      if (tried.size >= this.maxProviderAttempts) break;
      if (tried.has(provider.id)) continue;
      if (!provider.supportsCountry(country)) continue;
      if (!provider.isConfigured()) {
        vpnLog.info("Skipping unconfigured provider", { provider: provider.id, country });
        continue;
      }

      tried.add(provider.id);
      const start = Date.now();

      try {
        const result = await provider.connect(country);
        if (!result.proxyUrl) {
          lastError = result.error ?? `${provider.id}: no proxy`;
          await this.safeDisconnect(result.connection);
          continue;
        }

        const { isProxyReachable } = await import("../lib/proxyHealth.js");
        if (!(await isProxyReachable(result.proxyUrl))) {
          lastError = `${provider.id}: proxy unreachable`;
          await this.safeDisconnect(result.connection);
          continue;
        }

        if (config.vpn.verifyPublicIp) {
          const ip = await getPublicIpInfo(result.proxyUrl);
          if (ip && !countryMatches(country, ip)) {
            lastError = `IP country ${ip.countryCode} does not match requested ${country}`;
            vpnLog.warn("IP verification failed", {
              provider: provider.id,
              expected: country,
              actual: ip.countryCode,
              ipv4: ip.ipv4,
            });
            await this.safeDisconnect(result.connection);
            continue;
          }
        }

        if (result.connection) {
          activeConnections.set(result.connection.id, result.connection);
        }

        vpnLog.info("Route acquired", {
          provider: provider.id,
          country,
          durationMs: Date.now() - start,
          proxyEnabled: true,
          vpnEnabled: provider.id !== "http-proxy" && provider.id !== "socks5-proxy",
        });

        return this.buildRoute(country, result.proxyUrl, geo.geoBypass, provider.id, result.connection ?? undefined);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        vpnLog.warn("Provider connect failed", { provider: provider.id, error: lastError });
      }
    }

    // Fallback: admin DB proxy or YTDLP_PROXY env — only if reachable
    const fallbackProxy = dbProxy || envProxy;
    if (fallbackProxy) {
      const { isProxyReachable } = await import("../lib/proxyHealth.js");
      if (await isProxyReachable(fallbackProxy)) {
        vpnLog.info("Using fallback proxy from DB/env", { country });
        return this.buildRoute(country, fallbackProxy, geo.geoBypass, "http-proxy");
      }
      vpnLog.warn("Configured proxy unreachable, skipping", { country });
    }

    vpnLog.error("No route available for country", { country, lastError });
    return this.buildRoute(country, "", geo.geoBypass, "http-proxy");
  }

  async releaseRoute(connection?: VpnConnection): Promise<void> {
    if (!connection) return;
    activeConnections.delete(connection.id);
    const provider = getProviderById(connection.providerId);
    if (provider) {
      await provider.disconnect(connection).catch((err) => {
        vpnLog.warn("Disconnect failed", { error: err instanceof Error ? err.message : String(err) });
      });
    }
  }

  async runHealthChecks(expectedCountry?: string) {
    const results = [];
    for (const provider of getProviderRegistry()) {
      results.push(await provider.healthCheck(expectedCountry));
    }
    return results;
  }

  private selectProviders(explicit: string, country: string) {
    const all = getProviderRegistry();
    if (explicit && explicit !== "auto") {
      const one = getProviderById(explicit as VpnProviderId);
      return one ? [one] : all;
    }
    // Bangladesh: prioritize Tailscale + custom BD configs
    if (country === "BD") {
      const bdPriority: VpnProviderId[] = [
        "tailscale",
        "custom-wireguard",
        "custom-openvpn",
        "socks5-proxy",
        "http-proxy",
        "surfshark",
        "nordvpn",
        "protonvpn",
        "mullvad",
        "pia",
        "expressvpn",
        "wireguard",
        "openvpn",
      ];
      const ordered: typeof all = [];
      for (const id of bdPriority) {
        const p = all.find((x) => x.id === id);
        if (p) ordered.push(p);
      }
      for (const p of all) {
        if (!ordered.includes(p)) ordered.push(p);
      }
      return ordered;
    }
    return all;
  }

  private buildRoute(
    country: string,
    proxyUrl: string,
    geoBypass: boolean,
    providerId: VpnProviderId,
    connection?: VpnConnection
  ): NetworkRoute {
    return {
      country,
      proxyUrl,
      providerId,
      connection,
      xffCountry: country,
      geoBypass,
    };
  }

  private async safeDisconnect(connection: VpnConnection | null | undefined): Promise<void> {
    if (connection) await this.releaseRoute(connection);
  }
}

let singleton: VpnManager | null = null;

export function getVpnManager(): VpnManager {
  if (!singleton) singleton = new VpnManager();
  return singleton;
}

/** Execute yt-dlp operation with automatic provider failover on retryable errors. */
export async function withVpnFailover<T>(
  country: string | undefined,
  operation: (route: NetworkRoute) => Promise<T>
): Promise<T> {
  const manager = getVpnManager();
  const maxRounds = Number(process.env.VPN_FAILOVER_ROUNDS ?? 3);
  let lastErr: Error | null = null;
  let route: NetworkRoute | null = null;

  for (let round = 0; round < maxRounds; round++) {
    route = await manager.acquireRoute(country);
    try {
      const result = await operation(route);
      return result;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const { classifyYtDlpError } = await import("./errors.js");
      const { retryPolicy } = classifyYtDlpError(lastErr.message);
      vpnLog.warn("Download attempt failed", {
        round: round + 1,
        provider: route.providerId,
        country: route.country,
        retryable: retryPolicy.retryable,
        reason: retryPolicy.reason,
      });
      await manager.releaseRoute(route.connection);
      invalidateNetworkRouteCache();
      if (!retryPolicy.retryable || round + 1 >= maxRounds) break;
      if (config.vpn.autoReconnect) {
        await new Promise((r) => setTimeout(r, 1000 * (round + 1)));
      }
    }
  }

  throw lastErr ?? new Error("Download failed after VPN failover attempts.");
}
