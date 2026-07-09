#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

log info "Restarting network stack"
bash "${OPS_DIR}/disconnect-vpn.sh" || true
sleep 2
bash "${OPS_DIR}/connect-country.sh" "${VPN_COUNTRY:-BD}" "${VPN_PROVIDER:-auto}"
bash "${OPS_DIR}/health-check.sh"
