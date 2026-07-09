#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"
COUNTRY="$(normalize_country "${2:-${VPN_COUNTRY:-BD}}")"

log info "yt-dlp test" "url=${URL}" "country=${COUNTRY}"

bash "${OPS_DIR}/connect-country.sh" "${COUNTRY}" "${VPN_PROVIDER:-auto}" >/dev/null
PROXY_LINE=$(bash "${OPS_DIR}/connect-country.sh" "${COUNTRY}" 2>/dev/null | grep '^PROXY=' || true)
PROXY="${PROXY_LINE#PROXY=}"

ARGS=(--socket-timeout "${YTDLP_TIMEOUT:-60}" --retries "${YTDLP_RETRIES:-5}" --no-playlist -J)
[[ -n "${PROXY}" ]] && ARGS+=(--proxy "${PROXY}")
ARGS+=(--xff "${COUNTRY}" "${URL}")

yt-dlp "${ARGS[@]}" | jq -r '.title // "OK"'
