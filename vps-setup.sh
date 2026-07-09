#!/usr/bin/env bash
# DownloadHub Pro — First-time VPS setup script
# Run this ONCE on a fresh VPS as root (or a sudo user).
# Usage:  bash vps-setup.sh [your-domain.com]
set -euo pipefail

DOMAIN="${1:-tinydown.com}"
REPO="https://github.com/Sudipto12345/downloaderpro.git"
APP_DIR="/opt/downloaderpro"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       DownloadHub Pro — VPS First-Time Setup                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Domain:  $DOMAIN"
echo "App dir: $APP_DIR"
echo ""

# ── 1. System dependencies ─────────────────────────────────────────
echo "📦  Installing system packages…"
apt-get update -qq
apt-get install -y --no-install-recommends \
  curl git ca-certificates gnupg ufw

# ── 2. Docker ─────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "🐳  Installing Docker…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅  Docker installed: $(docker --version)"
else
  echo "✅  Docker already installed: $(docker --version)"
fi

# ── 3. Clone or update repo ────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "🔄  Updating existing repo at $APP_DIR…"
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  echo "📥  Cloning repository…"
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 4. Configure .env ─────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚙️   Creating .env from example…"
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"

  # Auto-generate secrets
  JWT_SECRET=$(openssl rand -base64 48)
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)

  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$APP_DIR/.env"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" "$APP_DIR/.env"
  sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" "$APP_DIR/.env"
  sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=true|" "$APP_DIR/.env"

  echo "✅  .env created with auto-generated secrets."
  echo "    ⚠️  Review it: nano $APP_DIR/.env"
else
  echo "✅  .env already exists — skipping (not overwriting)."
fi

# ── 5. Firewall ────────────────────────────────────────────────────
echo "🔒  Configuring UFW firewall…"
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "✅  Firewall: SSH + HTTP(S) allowed."

# ── 6. Build & start ──────────────────────────────────────────────
echo "🏗️   Building Docker images (this takes a few minutes)…"
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml build

echo "🚀  Starting all services…"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "📊  Service status:"
docker compose -f docker-compose.prod.yml ps

# ── 7. Nginx on host (reverse proxy + SSL) ────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Optional: Install Caddy for HTTPS (auto SSL)              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Run these commands to get HTTPS via Caddy:"
echo ""
echo "  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https"
echo "  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor > /usr/share/keyrings/caddy-stable-archive-keyring.gpg"
echo "  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list"
echo "  apt-get update && apt-get install caddy"
echo ""
echo "Then create /etc/caddy/Caddyfile:"
echo "  ${DOMAIN} {"
echo "      reverse_proxy localhost:8090"
echo "  }"
echo "  admin.${DOMAIN} {"
echo "      reverse_proxy localhost:4000"
echo "  }"
echo "  systemctl reload caddy"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅  SETUP COMPLETE!"
echo ""
echo "  Site:       http://<your-server-ip>:8090"
echo "  API:        http://<your-server-ip>:4000"
echo ""
echo "Default login (change immediately!):"
echo "  Admin:  admin@downloadhub.com / admin123"
echo "  User:   user@downloadhub.com  / user123"
echo ""
echo "Future deploys:  cd $APP_DIR && bash deploy-vps.sh"
echo "Logs:            docker compose -f docker-compose.prod.yml logs -f backend"
echo "═══════════════════════════════════════════════════════════════"
