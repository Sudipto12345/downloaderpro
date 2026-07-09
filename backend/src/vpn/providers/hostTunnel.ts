import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import type { ProviderConnectResult, ProviderHealth, VpnConnection } from "../types.js";
import { BaseVpnProvider } from "./base.js";
import { getPublicIpInfo, countryMatches } from "../ipVerify.js";
import { vpnLog } from "../logger.js";
import { config } from "../../config.js";

const execFileAsync = promisify(execFile);

const OPS_BIN = process.env.VPN_OPS_DIR ?? "/opt/downloaderpro/ops/scripts";

async function runOpsScript(script: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const path = `${OPS_BIN}/${script}`;
  if (!existsSync(path)) {
    return { ok: false, stdout: "", stderr: `Script not found: ${path}` };
  }
  try {
    const { stdout, stderr } = await execFileAsync("bash", [path, ...args], {
      timeout: Number(process.env.VPN_SCRIPT_TIMEOUT ?? 120_000),
      env: { ...process.env },
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, stdout: e.stdout?.trim() ?? "", stderr: e.stderr?.trim() ?? e.message ?? "script failed" };
  }
}

/** Shared helper for host-managed VPN tunnels that expose a local SOCKS/HTTP proxy. */
export abstract class HostTunnelProvider extends BaseVpnProvider {
  protected abstract readonly connectScript: string;
  protected abstract readonly disconnectScript: string;
  protected abstract readonly credentialEnvVars: string[];

  isConfigured(): boolean {
    return this.credentialEnvVars.every((k) => Boolean(process.env[k]?.trim()));
  }

  async connect(country: string): Promise<ProviderConnectResult> {
    if (!this.isConfigured()) return this.missingCredentials();

    const result = await runOpsScript(this.connectScript, [country.toUpperCase(), this.id]);
    if (!result.ok) {
      vpnLog.warn("Host tunnel connect failed", { provider: this.id, country, error: result.stderr });
      return { connection: null, proxyUrl: "", error: result.stderr || "connect failed" };
    }

    const proxyUrl = result.stdout.split("\n").find((l) => l.startsWith("PROXY="))?.slice(6)
      ?? config.vpn.localProxyUrl
      ?? config.ytdlp.proxy;

    if (!proxyUrl) {
      return { connection: null, proxyUrl: "", error: "No proxy URL returned from connect script" };
    }

    const connection: VpnConnection = {
      id: randomUUID(),
      providerId: this.id,
      country: country.toUpperCase(),
      proxyUrl,
      connectedAt: Date.now(),
    };

    return { connection, proxyUrl };
  }

  async disconnect(connection: VpnConnection): Promise<void> {
    await runOpsScript(this.disconnectScript, [connection.country, this.id]);
    vpnLog.info("Disconnected host tunnel", { provider: this.id, country: connection.country });
  }

  async healthCheck(expectedCountry?: string): Promise<ProviderHealth> {
    const proxyUrl = config.vpn.localProxyUrl || config.ytdlp.proxy;
    const ip = await getPublicIpInfo(proxyUrl);
    const match = expectedCountry ? countryMatches(expectedCountry, ip) : Boolean(ip?.countryCode);
    return {
      providerId: this.id,
      ok: Boolean(ip),
      authenticated: this.isConfigured(),
      connected: Boolean(proxyUrl),
      internet: Boolean(ip),
      dns: Boolean(ip),
      proxyAlive: Boolean(proxyUrl),
      countryMatch: match,
      bandwidthOk: true,
      publicIp: ip ?? undefined,
      message: ip ? undefined : "Could not verify public IP",
    };
  }
}

export { runOpsScript };
