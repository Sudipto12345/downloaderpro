# DownloadHub Pro backend: Express + yt-dlp + Prisma (PostgreSQL)
FROM node:20-bookworm-slim

# yt-dlp (python), ffmpeg, curl_cffi for TikTok/Instagram impersonation
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       python3 python3-pip ffmpeg ca-certificates openssl \
  && pip3 install --no-cache-dir --break-system-packages -U yt-dlp curl_cffi brotli \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (kept intact so Prisma CLI + tsx are available at runtime)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Generate Prisma client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Build TypeScript
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc -p tsconfig.json

COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
COPY backend/scripts ./scripts
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
