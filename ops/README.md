# Geo-unlock VPN infrastructure

Production-grade, plugin-based VPN/proxy routing for geo-restricted yt-dlp downloads.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin Geo UI   │────▶│  ytdlpGeo (DB)   │     │  ops/scripts/   │
│  /api/admin/geo │     │  per-country     │     │  host VPN CLI   │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                          │
                                 ▼                          │
                        ┌────────────────┐                  │
                        │  VpnManager    │◀─────────────────┘
                        │  (plugin registry + failover)     │
                        └────────┬───────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │  yt-dlp        │
                        │  --proxy --xff │
                        └────────────────┘
```

- **Backend** (`backend/src/vpn/`): TypeScript plugin framework with provider priority, IP verification, automatic failover.
- **Host ops** (`ops/scripts/`): Bash automation for OpenVPN, WireGuard, Tailscale, commercial VPN CLIs.
- **Admin panel**: Existing Geo Downloads tab remains the DB-backed config (unchanged API).

## Quick start (VPS)

```bash
cd /opt/downloaderpro
chmod +x ops/scripts/*.sh
sudo ops/scripts/install-dependencies.sh
sudo ops/scripts/setup-vpn.sh
```

Copy and edit secrets:

```bash
sudo cp ops/config/proxy.example.json /etc/downloaderpro/proxy.json
sudo nano /etc/downloaderpro/proxy.json
sudo nano /opt/downloaderpro/.env   # add VPN_* and provider credentials
```

Enable systemd (optional):

```bash
sudo systemctl enable --now vpn-manager.service vpn-health.service ytdl-monitor.service
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VPN_PROVIDER` | `auto` | Provider id or `auto` for priority failover |
| `VPN_COUNTRY` | `BD` | Default target country (ISO 3166-1 alpha-2) |
| `YTDLP_PROXY` | | Fallback proxy URL for yt-dlp |
| `YTDLP_TIMEOUT` | `60` | Socket timeout seconds |
| `YTDLP_RETRIES` | `5` | yt-dlp retry count |
| `AUTO_RECONNECT` | `true` | Retry with next provider on failure |
| `VERIFY_PUBLIC_IP` | `true` | Abort if exit IP country mismatches |
| `VPN_LOCAL_PROXY_URL` | | Host proxy reachable from Docker |

## Bangladesh setup

Commercial VPNs rarely offer Bangladesh exits. Recommended options:

1. **Tailscale exit node** on a device in Bangladesh:
   ```bash
   export TAILSCALE_EXIT_NODE_BD=<node-id-or-hostname>
   export VPN_LOCAL_PROXY_URL=socks5://host.docker.internal:1080
   ```

2. **Custom WireGuard** config from your own BD server:
   ```bash
   export CUSTOM_WG_BD_CONFIG=/etc/wireguard/bd.conf
   ```

3. **Custom SOCKS5 proxy** in `proxy.json` or admin Geo panel.

## Scripts

| Script | Purpose |
|--------|---------|
| `install-dependencies.sh` | Idempotent apt + yt-dlp + Docker install |
| `setup-vpn.sh` | Copy configs, enable systemd |
| `connect-country.sh` | Connect provider for country |
| `disconnect-vpn.sh` | Tear down tunnels |
| `verify-country.sh` | Confirm public IP country |
| `verify-ip.sh` | Show IP, ASN, ISP |
| `switch-provider.sh` | Change active provider |
| `health-check.sh` | Full connectivity probe |
| `restart-network.sh` | Disconnect + reconnect |
| `ytdl-test.sh` | Test yt-dlp with current route |
| `diagnostics.sh` | Full system report |

## Provider priority (auto mode)

1. Surfshark → 2. NordVPN → 3. ProtonVPN → 4. Mullvad → 5. PIA → 6. ExpressVPN → 7. HTTP Proxy → 8. SOCKS5 → 9. WireGuard → 10. OpenVPN → 11. Tailscale

**Bangladesh** prioritizes: Tailscale → Custom WG/OVPN → SOCKS5 → HTTP → commercial VPNs.

## Security

- Never commit credentials. Use `.env` and `/etc/downloaderpro/vpn.env`.
- Logs mask passwords, tokens, and proxy auth.
- Only use VPNs/proxies you legally own or are authorized to use.

## Rollback

```bash
sudo systemctl disable --now vpn-manager vpn-health ytdl-monitor
export VPN_PROVIDER=none
# Restore previous .env and docker compose up -d
```

Existing admin geo API and `YTDLP_PROXY` continue to work without the VPN framework.
