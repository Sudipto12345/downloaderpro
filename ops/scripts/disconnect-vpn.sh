#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

COUNTRY="$(normalize_country "${1:-}")"
PROVIDER="${2:-}"

log info "Disconnecting VPN" "country=${COUNTRY}" "provider=${PROVIDER}"

sudo pkill -f openvpn 2>/dev/null || true
if command_exists wg-quick; then
  sudo wg-quick down "${WG_INTERFACE:-wg0}" 2>/dev/null || true
fi
if command_exists tailscale; then
  sudo tailscale up --exit-node= 2>/dev/null || true
fi
if command_exists nordvpn; then
  nordvpn disconnect 2>/dev/null || true
fi

clear_state
log info "VPN disconnected"
