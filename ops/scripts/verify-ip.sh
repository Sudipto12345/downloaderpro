#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

json=$(curl -fsS --max-time 15 "http://ip-api.com/json/?fields=status,country,countryCode,query,isp,as,mobile,proxy,hosting" 2>/dev/null) || die "IP lookup failed"

echo "${json}" | jq .
IP=$(echo "${json}" | jq -r '.query')
CC=$(echo "${json}" | jq -r '.countryCode')
log info "Public IP verified" "ipv4=${IP}" "country=${CC}"
