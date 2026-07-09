#!/usr/bin/env bash
# Update admin DB geo config with BD SOCKS proxy (run on VPS after bd-exit-setup.sh)
set -euo pipefail
PROXY_URL="${1:-socks5://host.docker.internal:1080}"

docker exec downloaderpro-backend-1 node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const row = await p.setting.findUnique({ where: { key: 'ytdlpGeo' } });
  const val = row?.value || {};
  val.defaultCountry = 'BD';
  val.geoBypass = true;
  val.proxy = '${PROXY_URL}';
  val.countryProxies = (val.countryProxies || []).map(c =>
    c.country === 'BD' ? { ...c, proxy: '${PROXY_URL}', enabled: true } : c
  );
  if (!val.countryProxies.some(c => c.country === 'BD')) {
    val.countryProxies.push({ country: 'BD', label: 'Bangladesh', proxy: '${PROXY_URL}', enabled: true });
  }
  await p.setting.upsert({
    where: { key: 'ytdlpGeo' },
    create: { key: 'ytdlpGeo', value: val },
    update: { value: val },
  });
  console.log('Updated ytdlpGeo BD proxy to ${PROXY_URL}');
  await p.\$disconnect();
})();
"
