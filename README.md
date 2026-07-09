# DownloadHub Pro

A modern, multi-platform **video & image downloader SaaS** built on the open-source
[`yt-dlp`](https://github.com/yt-dlp/yt-dlp) engine. Download videos, reels, shorts,
stories, images and audio from YouTube, TikTok, Instagram, Facebook and 1000+ sites.

> For personal use only. Always respect copyright and each platform's Terms of Service.

See [`docs/PRD.md`](docs/PRD.md) for the full product spec and [`DEPLOY.md`](DEPLOY.md)
for VPS deployment.

## What's implemented

- yt-dlp powered **analyze + download** with live progress (SSE).
- **Real accounts**: email/password auth with bcrypt hashes and JWT httpOnly-cookie sessions.
- **PostgreSQL** persistence (via Prisma) for users, download history and favorites.
- **Per-plan daily quota** + resolution gating enforced on the server.
- **Dashboard**: history, favorites, profile, plan usage.
- **Admin panel**: user management (ban / change plan), download logs, analytics.
- **Mock subscriptions**: instant plan upgrades (Free / Pro / Business), no real charge yet.
- **One-command Docker deployment** (PostgreSQL + backend + Nginx SPA).

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn-style UI, TanStack Query, Zustand
- **Backend:** Node.js, Express, TypeScript, Prisma, JWT, yt-dlp (via Python)
- **Database:** PostgreSQL
- **Engine:** `yt-dlp` (+ `ffmpeg` for 1080p/4K merging & MP3)
- **Deploy:** Docker Compose + Nginx

## Project structure

```
downloaderpro/
├─ backend/                # Express + TypeScript API (yt-dlp + Prisma/Postgres)
│  ├─ prisma/
│  │  ├─ schema.prisma     # User / Download / Favorite models
│  │  └─ seed.ts           # default admin + demo user
│  └─ src/
│     ├─ index.ts          # app wiring, CORS, rate limiting
│     ├─ config.ts         # env config
│     ├─ db.ts             # PrismaClient singleton
│     ├─ lib/              # jwt, plan limits
│     ├─ middleware/auth.ts# requireAuth / requireAdmin (JWT cookie)
│     └─ routes/           # auth, downloads, favorites, admin, download (yt-dlp)
├─ frontend/               # React 19 + Vite SPA
│  └─ src/
│     ├─ lib/apiClient.ts  # fetch wrapper (credentials: include)
│     ├─ lib/db.ts         # typed API client (auth/downloads/favorites/admin)
│     ├─ lib/AuthContext.tsx
│     └─ components/, pages/
├─ nginx/default.conf      # SPA + /api reverse proxy (SSE-friendly)
├─ docker-compose.yml      # db + backend + web
├─ deploy.sh               # build & start helper
├─ DEPLOY.md               # VPS deployment guide
└─ legacy-flask/           # original Flask prototype (reference)
```

## Quick start (Docker — recommended)

```bash
cp .env.example .env
# set JWT_SECRET (openssl rand -base64 48) and POSTGRES_PASSWORD
docker compose up -d --build
```

Open <http://localhost>. The backend auto-creates the schema and seeds:

- admin: `admin@downloadhub.com` / `admin123`
- user: `user@downloadhub.com` / `user123`

## Local development (without Docker)

Prerequisites: Node 18+, Python 3.9+, `pip install -U yt-dlp`, optionally `ffmpeg`,
and a PostgreSQL instance (the quickest is `docker compose up -d db`).

**1. Backend** (port 4000):

```bash
cd backend
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
npm install
npx prisma db push            # create tables
npm run db:seed               # seed admin/demo accounts
npm run dev
```

**2. Frontend** (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api/*` to the backend.

## API

Auth & data (JSON, session via httpOnly cookie):

- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `PATCH /api/auth/me` (name) · `POST /api/auth/me/plan` (mock upgrade)
- `GET /api/downloads` · `POST /api/downloads` (records + enforces quota) · `GET /api/downloads/today-count`
- `GET /api/favorites` · `POST /api/favorites` (toggle) · `DELETE /api/favorites/:id`
- `GET /api/admin/users` · `PATCH /api/admin/users/:id` · `GET /api/admin/downloads` · `GET /api/admin/analytics`

yt-dlp engine:

- `POST /api/analyze` — body `{ "url": "..." }` → media metadata + format options
- `POST /api/download/start` → `{ jobId }`; `GET /api/download/progress/:jobId` (SSE); `GET /api/download/file/:jobId`
- `GET /api/health` — status + ffmpeg availability

`choice` values: `best`, `h2160` / `h1080` / `h720` … (by height), `audio`, `image`.

## Notes & limitations

- First analyze of a YouTube URL can take ~10–20s (yt-dlp extraction).
- Private / age-restricted content needs login cookies (planned for a later phase).
- Without ffmpeg, downloads use progressive formats (typically up to 720p on YouTube).
- Keep yt-dlp updated for best site support (`docker compose build backend` rebuilds it).
- Payments are mocked (instant plan switch). Real gateways, OAuth and object storage are future work.
