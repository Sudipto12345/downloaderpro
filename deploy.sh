#!/usr/bin/env bash
# DownloadHub Pro — build & (re)deploy the full stack via Docker Compose.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env and fill in JWT_SECRET / passwords first:"
  echo "  cp .env.example .env && \${EDITOR:-nano} .env"
  exit 1
fi

# Pick the available compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose not found. Install Docker first (see DEPLOY.md)."
  exit 1
fi

echo "==> Building images…"
$COMPOSE build

echo "==> Starting services (db, backend, web)…"
$COMPOSE up -d

echo "==> Current status:"
$COMPOSE ps

echo
echo "Done. The site is served on port \${WEB_PORT:-80}."
echo "Backend applies the DB schema and seeds the default admin/user on startup."
echo "View logs with:  $COMPOSE logs -f backend"
