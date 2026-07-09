#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

PROVIDER="${1:-${VPN_PROVIDER:-auto}}"
export VPN_PROVIDER="${PROVIDER}"
bash "${OPS_DIR}/disconnect-vpn.sh"
bash "${OPS_DIR}/connect-country.sh" "${VPN_COUNTRY:-BD}" "${PROVIDER}"
bash "${OPS_DIR}/verify-country.sh" "${VPN_COUNTRY:-BD}"
