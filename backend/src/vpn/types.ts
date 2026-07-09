/** Core types for the plugin-based VPN / proxy routing framework. */

export type VpnProviderId =
  | "surfshark"
  | "nordvpn"
  | "protonvpn"
  | "mullvad"
  | "pia"
  | "expressvpn"
  | "http-proxy"
  | "socks5-proxy"
  | "wireguard"
  | "openvpn"
  | "tailscale"
  | "custom-wireguard"
  | "custom-openvpn";

export type ProxyScheme = "http" | "https" | "socks5";

export interface PublicIpInfo {
  ipv4?: string;
  ipv6?: string;
  countryCode: string;
  countryName?: string;
  asn?: string;
  isp?: string;
  raw?: Record<string, unknown>;
}

export interface VpnConnection {
  id: string;
  providerId: VpnProviderId;
  country: string;
  /** Proxy URL for yt-dlp --proxy (http/https/socks5). */
  proxyUrl?: string;
  /** Host network interface when tunnel-based (wg0, tun0, tailscale0). */
  interfaceName?: string;
  connectedAt: number;
}

export interface ProviderHealth {
  providerId: VpnProviderId;
  ok: boolean;
  authenticated: boolean;
  connected: boolean;
  internet: boolean;
  dns: boolean;
  proxyAlive: boolean;
  countryMatch: boolean;
  bandwidthOk: boolean;
  message?: string;
  publicIp?: PublicIpInfo;
}

export interface NetworkRoute {
  country: string;
  proxyUrl: string;
  providerId: VpnProviderId;
  connection?: VpnConnection;
  publicIp?: PublicIpInfo;
  xffCountry: string;
  geoBypass: boolean;
}

export interface ProviderConnectResult {
  connection: VpnConnection | null;
  proxyUrl: string;
  error?: string;
}

export interface VpnProviderConfig {
  id: VpnProviderId;
  enabled: boolean;
  priority: number;
  countries: string[];
  /** Env var names for credentials (never store values here). */
  credentialEnv?: string[];
  notes?: string;
}

export interface CountryDefinition {
  code: string;
  name: string;
  aliases?: string[];
}

export interface RetryPolicy {
  maxAttempts: number;
  retryable: boolean;
  reason: string;
}
