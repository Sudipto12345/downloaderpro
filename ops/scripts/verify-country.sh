#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

EXPECTED="$(normalize_country "${1:-${VPN_COUNTRY:-BD}}")"
PROXY="${YTDLP_PROXY:-${VPN_LOCAL_PROXY_URL:-}}"

json=$(curl -fsS --max-time 15 "http://ip-api.com/json/?fields=status,countryCode,query,isp,as" 2>/dev/null) || die "IP check failed"

CODE=$(echo "${json}" | jq -r '.countryCode // empty')
IP=$(echo "${json}" | jq -r '.query // empty')
ISP=$(echo "${json}" | jq -r '.isp // empty')

log info "Public IP check" "ip=${IP}" "country=${CODE}" "expected=${EXPECTED}" "isp=${ISP}"

if [[ "${CODE}" != "${EXPECTED}" ]]; then
  die "Country mismatch: got ${CODE}, expected ${EXPECTED}"
fi

echo "OK country=${CODE} ip=${IP} isp=${ISP}"
