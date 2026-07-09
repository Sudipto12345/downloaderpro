import type { IVpnProvider } from "./base.js";
import {
  HttpProxyProvider,
  Socks5ProxyProvider,
  createCommercialVpnProvider,
  loadProviderConfigs,
} from "./staticProxy.js";
import { HostTunnelProvider } from "./hostTunnel.js";
import type { VpnProviderId } from "../types.js";

class WireGuardProvider extends HostTunnelProvider {
  readonly id = "wireguard" as const;
  readonly priority = 9;
  protected readonly connectScript = "connect-country.sh";
  protected readonly disconnectScript = "disconnect-vpn.sh";
  protected readonly credentialEnvVars = ["WG_CONFIG_PATH", "WG_INTERFACE"];

  supportsCountry(_country: string): boolean {
    return this.isConfigured();
  }
}

class OpenVpnProvider extends HostTunnelProvider {
  readonly id = "openvpn" as const;
  readonly priority = 10;
  protected readonly connectScript = "connect-country.sh";
  protected readonly disconnectScript = "disconnect-vpn.sh";
  protected readonly credentialEnvVars = ["OPENVPN_CONFIG_DIR"];

  supportsCountry(_country: string): boolean {
    return this.isConfigured();
  }
}

class CustomWireGuardProvider extends HostTunnelProvider {
  readonly id = "custom-wireguard" as const;
  readonly priority = 9;
  protected readonly connectScript = "connect-country.sh";
  protected readonly disconnectScript = "disconnect-vpn.sh";
  protected readonly credentialEnvVars = ["CUSTOM_WG_BD_CONFIG", "CUSTOM_WG_CONFIG"];

  supportsCountry(country: string): boolean {
    if (country.toUpperCase() === "BD" && process.env.CUSTOM_WG_BD_CONFIG) return true;
    return Boolean(process.env.CUSTOM_WG_CONFIG);
  }
}

class CustomOpenVpnProvider extends HostTunnelProvider {
  readonly id = "custom-openvpn" as const;
  readonly priority = 10;
  protected readonly connectScript = "connect-country.sh";
  protected readonly disconnectScript = "disconnect-vpn.sh";
  protected readonly credentialEnvVars = ["CUSTOM_OVPN_BD_CONFIG", "CUSTOM_OVPN_CONFIG"];

  supportsCountry(country: string): boolean {
    if (country.toUpperCase() === "BD" && process.env.CUSTOM_OVPN_BD_CONFIG) return true;
    return Boolean(process.env.CUSTOM_OVPN_CONFIG);
  }
}

class TailscaleProvider extends HostTunnelProvider {
  readonly id = "tailscale" as const;
  readonly priority = 11;
  protected readonly connectScript = "connect-country.sh";
  protected readonly disconnectScript = "disconnect-vpn.sh";
  protected readonly credentialEnvVars = ["TAILSCALE_AUTH_KEY", "TAILSCALE_EXIT_NODE"];

  supportsCountry(country: string): boolean {
    // Exit node country is configured via TAILSCALE_EXIT_NODE or per-country env TAILSCALE_EXIT_NODE_BD etc.
    const specific = process.env[`TAILSCALE_EXIT_NODE_${country.toUpperCase()}`];
    return Boolean(process.env.TAILSCALE_EXIT_NODE || specific || process.env.TAILSCALE_AUTH_KEY);
  }
}

/** Default provider registry ordered by priority (lower = tried first). */
function buildDefaultProviders(): IVpnProvider[] {
  return [
    createCommercialVpnProvider("surfshark", 1, ["SURFSHARK_USER", "SURFSHARK_PASSWORD"], "all"),
    createCommercialVpnProvider("nordvpn", 2, ["NORDVPN_TOKEN", "NORDVPN_USER", "NORDVPN_PASSWORD"], "all"),
    createCommercialVpnProvider("protonvpn", 3, ["PROTONVPN_USER", "PROTONVPN_PASSWORD"], "all"),
    createCommercialVpnProvider("mullvad", 4, ["MULLVAD_ACCOUNT"], "all"),
    createCommercialVpnProvider("pia", 5, ["PIA_USER", "PIA_PASSWORD"], "all"),
    createCommercialVpnProvider("expressvpn", 6, ["EXPRESSVPN_ACTIVATION_CODE"], "all"),
    new HttpProxyProvider(),
    new Socks5ProxyProvider(),
    new CustomWireGuardProvider(),
    new CustomOpenVpnProvider(),
    new WireGuardProvider(),
    new OpenVpnProvider(),
    new TailscaleProvider(),
  ];
}

let registry: IVpnProvider[] | null = null;

export function getProviderRegistry(): IVpnProvider[] {
  if (registry) return registry;

  const configs = loadProviderConfigs();
  const defaults = buildDefaultProviders();

  if (!configs.length) {
    registry = defaults.sort((a, b) => a.priority - b.priority);
    return registry;
  }

  const enabledIds = new Set(
    configs.filter((c) => c.enabled).map((c) => c.id as VpnProviderId)
  );

  registry = defaults
    .filter((p) => enabledIds.size === 0 || enabledIds.has(p.id))
    .sort((a, b) => a.priority - b.priority);

  return registry;
}

export function getProviderById(id: VpnProviderId): IVpnProvider | undefined {
  return getProviderRegistry().find((p) => p.id === id);
}

export function resetProviderRegistry(): void {
  registry = null;
}
