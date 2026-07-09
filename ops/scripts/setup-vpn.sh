#!/usr/bin/env bash
# Initial VPN framework setup on the host.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

COUNTRY="$(normalize_country "${VPN_COUNTRY:-BD}")"
PROVIDER="${VPN_PROVIDER:-auto}"

log info "Setting up VPN framework" "country=${COUNTRY}" "provider=${PROVIDER}"

bash "${OPS_DIR}/install-dependencies.sh"

sudo mkdir -p /etc/downloaderpro /run/vpn /var/log/vpn-manager
sudo cp -n "${CONFIG_DIR}/countries.json" /etc/downloaderpro/ 2>/dev/null || true
sudo cp -n "${CONFIG_DIR}/vpn.providers.json" /etc/downloaderpro/ 2>/dev/null || true

if [[ ! -f /etc/downloaderpro/proxy.json ]]; then
  sudo cp "${CONFIG_DIR}/proxy.example.json" /etc/downloaderpro/proxy.json
  log info "Created /etc/downloaderpro/proxy.json from example — edit with your proxies"
fi

# Install systemd units
for unit in vpn-manager vpn-health ytdl-monitor; do
  sudo cp "${OPS_DIR}/../systemd/${unit}.service" "/etc/systemd/system/"
  sudo systemctl daemon-reload
  sudo systemctl enable "${unit}.service" 2>/dev/null || true
done

log info "VPN framework setup complete"
