#!/bin/sh
set -e

echo "[entrypoint] Applying database schema (prisma db push)…"
npx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] Seeding default accounts…"
npm run db:seed || echo "[entrypoint] seed step skipped/failed (continuing)"

echo "[entrypoint] Ensuring admin accounts…"
npx tsx scripts/ensure-admins.ts || echo "[entrypoint] ensure-admins skipped/failed (continuing)"

echo "[entrypoint] Ensuring GSC verification…"
npx tsx scripts/ensure-gsc.ts || echo "[entrypoint] ensure-gsc skipped/failed (continuing)"

echo "[entrypoint] Starting backend…"
exec node dist/index.js
