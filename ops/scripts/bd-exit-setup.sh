#!/usr/bin/env bash
# Run ONCE on the VPS. Prepares host to receive a Bangladesh reverse-SSH SOCKS tunnel.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

PROXY_PORT="${BD_TUNNEL_PORT:-1080}"
ENV_FILE="${PROJECT_ROOT}/.env"

log info "Setting up Bangladesh exit tunnel receiver on port ${PROXY_PORT}"

# Ensure SSH allows reverse forwarding (default on Ubuntu)
if grep -q '^AllowTcpForwarding' /etc/ssh/sshd_config 2>/dev/null; then
  sudo sed -i 's/^AllowTcpForwarding.*/AllowTcpForwarding yes/' /etc/ssh/sshd_config
else
  echo "AllowTcpForwarding yes" | sudo tee -a /etc/ssh/sshd_config >/dev/null
fi
sudo systemctl reload sshd 2>/dev/null || sudo systemctl reload ssh 2>/dev/null || true

sudo mkdir -p /etc/downloaderpro
sudo cp -n "${CONFIG_DIR}/proxy.example.json" /etc/downloaderpro/proxy.json 2>/dev/null || true

# Proxy URL used inside Docker backend container
PROXY_URL="socks5://host.docker.internal:${PROXY_PORT}"

# Merge into .env
touch "${ENV_FILE}"
grep -q '^YTDLP_PROXY=' "${ENV_FILE}" && sed -i "s|^YTDLP_PROXY=.*|YTDLP_PROXY=${PROXY_URL}|" "${ENV_FILE}" || echo "YTDLP_PROXY=${PROXY_URL}" >> "${ENV_FILE}"
grep -q '^VPN_LOCAL_PROXY_URL=' "${ENV_FILE}" && sed -i "s|^VPN_LOCAL_PROXY_URL=.*|VPN_LOCAL_PROXY_URL=${PROXY_URL}|" "${ENV_FILE}" || echo "VPN_LOCAL_PROXY_URL=${PROXY_URL}" >> "${ENV_FILE}"
grep -q '^VPN_COUNTRY=' "${ENV_FILE}" && sed -i 's|^VPN_COUNTRY=.*|VPN_COUNTRY=BD|' "${ENV_FILE}" || echo "VPN_COUNTRY=BD" >> "${ENV_FILE}"
grep -q '^VPN_PROVIDER=' "${ENV_FILE}" && sed -i 's|^VPN_PROVIDER=.*|VPN_PROVIDER=socks5-proxy|' "${ENV_FILE}" || echo "VPN_PROVIDER=socks5-proxy" >> "${ENV_FILE}"

log info "Updated ${ENV_FILE} with BD tunnel proxy"

# Systemd: keep checking tunnel port
sudo cp "${OPS_DIR}/../systemd/bd-tunnel-watch.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bd-tunnel-watch.service 2>/dev/null || true

cat <<EOF

╔══════════════════════════════════════════════════════════════════╗
║  Bangladesh tunnel VPS setup complete                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Next: on a device IN BANGLADESH (home PC / phone / VPS), run:   ║
║                                                                  ║
║    curl -fsSL https://tinydown.com/bd-exit-client.sh | bash      ║
║                                                                  ║
║  Or copy ops/scripts/bd-exit-client.sh and run it there.         ║
║                                                                  ║
║  Then redeploy/restart backend:                                  ║
║    cd /opt/downloaderpro && docker compose -f docker-compose.prod.yml up -d
╚══════════════════════════════════════════════════════════════════╝

EOF
