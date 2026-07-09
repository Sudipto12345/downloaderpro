#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

FAIL=0
COUNTRY="$(normalize_country "${VPN_COUNTRY:-BD}")"

check() {
  local name="$1"
  shift
  if "$@"; then
    log info "HEALTH OK: ${name}"
  else
    log error "HEALTH FAIL: ${name}"
    FAIL=1
  fi
}

check internet curl -fsS --max-time 10 https://1.1.1.1 >/dev/null
check dns getent hosts youtube.com >/dev/null
check vpn_state test -f "${STATE_DIR}/status.json" || [[ -n "${YTDLP_PROXY:-}" ]]

if [[ -f "${STATE_DIR}/status.json" ]]; then
  log info "VPN state: $(cat "${STATE_DIR}/status.json")"
fi

bash "${OPS_DIR}/verify-ip.sh" >/dev/null && check country_match true || check country_match false

if [[ "${VERIFY_PUBLIC_IP:-true}" == "true" ]]; then
  bash "${OPS_DIR}/verify-country.sh" "${COUNTRY}" >/dev/null 2>&1 && check country_correct true || {
    log warn "Country verification skipped or failed (may be expected without VPN credentials)"
  }
fi

exit "${FAIL}"
