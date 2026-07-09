# PRD: Multi-Platform Video & Image Downloader SaaS

## Project Name
DownloadHub Pro

## Overview
A modern SaaS-based downloader platform that allows users to download videos, images, reels, shorts, stories, and audio from multiple social media platforms. The platform integrates **yt-dlp** as the core downloading engine and provides a clean user experience with free and premium subscription plans.

---

## Business Goal
A profitable downloader platform where users can register, login, purchase a subscription, download content, manage downloads, access premium features, and upgrade plans.

**Revenue sources:** Monthly subscription, Yearly subscription, Lifetime package, Advertisement revenue, Affiliate revenue.

---

## Supported Platforms
- **Video:** YouTube, TikTok, Instagram, Facebook, X (Twitter), Pinterest, Vimeo, Dailymotion
- **Image:** Instagram posts/carousels, Facebook images, Pinterest images, Twitter images
- **Audio:** YouTube MP3, TikTok audio, Facebook audio

---

## Technology Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand
- **Backend:** Node.js, Express.js, yt-dlp, FFmpeg, PostgreSQL
- **Database:** Supabase PostgreSQL
- **Storage:** Cloudflare R2 (AWS S3 optional)
- **Auth:** Supabase Auth (Google, GitHub, Email)

---

## User Roles
- **Guest:** homepage, pricing, limited downloads. No premium/history.
- **Registered:** login, download, history, favorites, profile.
- **Premium:** unlimited, HD/4K, batch, faster processing, no ads.
- **Admin:** manage users/packages/payments/downloads, analytics, ban users.

---

## Subscription Plans
| Plan | Price | Downloads/day | Max quality | Ads | Extras |
|------|-------|---------------|-------------|-----|--------|
| Free | $0 | 10 | 720p | Yes | — |
| Pro | $5/mo | Unlimited | 1080p | No | — |
| Business | $15/mo | Unlimited | 4K | No | Batch, priority queue |

---

## Payment Gateways
- **Bangladesh:** bKash, Nagad, Rocket, SSLCommerz
- **International:** Stripe, PayPal, Paddle

---

## Database Tables
- **users**: id, name, email, role, created_at
- **subscriptions**: id, user_id, package_id, start_date, expiry_date, status
- **packages**: id, name, price, features
- **downloads**: id, user_id, platform, media_url, file_type, download_date
- **payments**: id, user_id, amount, gateway, transaction_id, status
- **favorites**: id, user_id, media_url

---

## Security
Rate limiting, IP blocking, bot protection, Cloudflare protection, reCAPTCHA, JWT authentication.

---

## Roadmap (implementation phases)
- **Phase 1 — Core (in progress):** Monorepo, Express+yt-dlp backend (analyze/download), React landing page + download flow.
- **Phase 2 — Auth & DB:** Supabase auth (email/Google/GitHub), schema, download history.
- **Phase 3 — Subscriptions:** plans, quota/quality gating.
- **Phase 4 — Payments:** Stripe/PayPal + bKash/SSLCommerz.
- **Phase 5 — Admin & Analytics:** user/package/payment management, charts.
- **Future:** AI summaries/thumbnails, bulk downloader, Chrome extension, Android app, Telegram bot, API access, white-label.

## MVP Timeline
Week 1: Auth + Landing · Week 2: yt-dlp integration · Week 3: Download system · Week 4: Subscriptions · Week 5: Payments · Week 6: Admin panel · Week 7: Testing · Week 8: Launch.
