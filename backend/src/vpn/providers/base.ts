import type { ProviderConnectResult, ProviderHealth, VpnConnection, VpnProviderId } from "../types.js";

/** Plugin contract — add new providers by implementing this interface and registering. */
export interface IVpnProvider {
  readonly id: VpnProviderId;
  readonly priority: number;

  /** Whether this provider can serve the given ISO country code. */
  supportsCountry(country: string): boolean;

  /** Whether required credentials/config are present (no secrets logged). */
  isConfigured(): boolean;

  /** Establish route for country; returns proxy URL for yt-dlp. */
  connect(country: string): Promise<ProviderConnectResult>;

  /** Tear down an active connection. */
  disconnect(connection: VpnConnection): Promise<void>;

  /** Liveness probe for health checks. */
  healthCheck(expectedCountry?: string): Promise<ProviderHealth>;
}

export abstract class BaseVpnProvider implements IVpnProvider {
  abstract readonly id: VpnProviderId;
  abstract readonly priority: number;

  abstract supportsCountry(country: string): boolean;
  abstract isConfigured(): boolean;
  abstract connect(country: string): Promise<ProviderConnectResult>;
  abstract disconnect(connection: VpnConnection): Promise<void>;
  abstract healthCheck(expectedCountry?: string): Promise<ProviderHealth>;

  protected missingCredentials(): ProviderConnectResult {
    return { connection: null, proxyUrl: "", error: `${this.id}: credentials not configured` };
  }
}
