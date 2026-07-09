#!/usr/bin/env bash
# DownloadHub Pro — VPS Deploy Script
# Run this on your VPS after first-time setup (see DEPLOY.md).
# Usage:
#   ./deploy-vps.sh              — pull latest & rebuild (production)
#   ./deploy-vps.sh --full       — full rebuild (no cache)
#   ./deploy-vps.sh --restart    — restart services only (no rebuild)
#   ./deploy-vps.sh --logs       — tail live logs after deploy
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.prod.yml"
TAIL_LOGS=false
FULL_BUILD=false
RESTART_ONLY=false

for arg in "$@"; do
  case $arg in
    --logs)     TAIL_LOGS=true ;;
    --full)     FULL_BUILD=true ;;
    --restart)  RESTART_ONLY=true ;;
  esac
done

# ── Check prerequisites ────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌  No .env found."
  echo "    Copy .env.example to .env and fill in JWT_SECRET + passwords:"
  echo "    cp .env.example .env && nano .env"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1 && ! docker-compose version >/dev/null 2>&1; then
  echo "❌  Docker Compose not found. Install Docker first (see DEPLOY.md)."
  exit 1
fi

COMPOSE="docker compose -f $COMPOSE_FILE"

# ── Pull latest code from GitHub ───────────────────────────────────
if ! $RESTART_ONLY; then
  echo "🔄  Pulling latest code from GitHub…"
  git fetch origin main
  git reset --hard origin/main
  echo "✅  Code updated to: $(git log -1 --oneline)"
fi

# ── Build & deploy ─────────────────────────────────────────────────
if $RESTART_ONLY; then
  echo "🔄  Restarting services…"
  $COMPOSE restart
elif $FULL_BUILD; then
  echo "🏗️   Full rebuild (no cache)…"
  $COMPOSE build --no-cache
  $COMPOSE up -d
else
  echo "🏗️   Building updated images…"
  $COMPOSE build
  echo "🚀  Starting services…"
  $COMPOSE up -d
fi

# ── Status ─────────────────────────────────────────────────────────
echo ""
echo "📊  Service status:"
$COMPOSE ps

echo ""
echo "✅  Deploy complete!"
echo "    Site:    https://tinydown.com   (or http://<your-ip>)"
echo "    API:     https://admin.tinydown.com (or http://<your-ip>:4000)"
echo ""
echo "Useful commands:"
echo "  $COMPOSE logs -f backend     # backend logs"
echo "  $COMPOSE logs -f web         # nginx logs"
echo "  $COMPOSE exec db psql -U downloadhub downloadhub  # DB shell"
echo "  $COMPOSE down                # stop all services"
echo "  $COMPOSE down -v             # stop + wipe all data (DANGER)"

if $TAIL_LOGS; then
  echo ""
  echo "📋  Tailing logs (Ctrl+C to stop)…"
  $COMPOSE logs -f backend web
fi
