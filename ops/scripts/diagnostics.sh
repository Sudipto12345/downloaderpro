#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

echo "=== DownloaderPro VPN Diagnostics ==="
echo "Date: $(date -Iseconds)"
echo "Host: $(hostname)"
echo ""

echo "--- Dependencies ---"
for c in curl yt-dlp docker wg openvpn tailscale; do
  printf "  %-12s " "${c}"
  command -v "${c}" >/dev/null && echo "OK" || echo "MISSING"
done

echo ""
echo "--- Environment (non-secret) ---"
echo "  VPN_PROVIDER=${VPN_PROVIDER:-auto}"
echo "  VPN_COUNTRY=${VPN_COUNTRY:-BD}"
echo "  VERIFY_PUBLIC_IP=${VERIFY_PUBLIC_IP:-true}"
echo "  YTDLP_PROXY set: $([[ -n "${YTDLP_PROXY:-}" ]] && echo yes || echo no)"

echo ""
echo "--- VPN State ---"
if [[ -f "${STATE_DIR}/status.json" ]]; then
  cat "${STATE_DIR}/status.json" | jq .
else
  echo "  (not connected)"
fi

echo ""
echo "--- Public IP ---"
bash "${OPS_DIR}/verify-ip.sh" 2>/dev/null || echo "  IP check failed"

echo ""
echo "--- Health Check ---"
bash "${OPS_DIR}/health-check.sh" 2>&1 || true
