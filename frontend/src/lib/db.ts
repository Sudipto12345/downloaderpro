/* ------------------------------------------------------------------ */
/*  API-backed data layer for DownloadHub Pro                         */
/*  Talks to the Express backend (PostgreSQL). Auth via httpOnly      */
/*  session cookie, so requests just use credentials: "include".      */
/* ------------------------------------------------------------------ */

import { apiClient } from "./apiClient";

// ───────── Types ─────────

export type UserRole = "guest" | "user" | "premium" | "admin";
export type PlanId = "free" | "pro" | "business";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  planId: PlanId;
  banned: boolean;
  totpEnabled?: boolean;
  totpExempt?: boolean;
  isSuperAdmin?: boolean;
  isDeveloper?: boolean;
  createdAt: string; // ISO
}

export interface DownloadRecord {
  id: string;
  userId: string;
  title: string;
  platform: string;
  url: string;
  quality: string;
  thumbnail?: string;
  date: string; // ISO
}

export interface Favorite {
  id: string;
  userId: string;
  title: string;
  platform: string;
  url: string;
  thumbnail?: string;
  addedAt: string; // ISO
}

/** Admin view of a user, enriched with their lifetime download count. */
export interface AdminUser extends User {
  downloadCount: number;
  isSuperAdmin?: boolean;
  totpEnabled?: boolean;
  totpExempt?: boolean;
}

/** Admin view of a download, enriched with the owner's email. */
export interface AdminDownload extends DownloadRecord {
  userEmail: string;
}

export interface Analytics {
  totalUsers: number;
  totalDownloads: number;
  downloadsToday: number;
  dailyCounts: { date: string; count: number }[];
  dailyMetrics?: {
    date: string;
    downloads: number;
    pageViews: number;
    adClicks: number;
    adImpressions: number;
  }[];
  totalPageViews?: number;
  pageViewsToday?: number;
  totalAdClicks?: number;
  adClicksToday?: number;
  totalAdImpressions?: number;
  adImpressionsToday?: number;
  adStats?: { placement: string; enabled: boolean; clicks: number; impressions: number }[];
  enabledAds?: number;
  storage?: { fileCount: number; totalBytes: number };
  planDistribution: { free: number; pro: number; business: number };
  system?: { database: boolean; api: boolean };
  platformCounts?: Record<string, number>;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  maxDownloadsPerDay: number; // -1 = unlimited
  maxResolution: number; // e.g. 720, 1080, 2160
  features: string[];
}

// ───────── Plan catalog (static, shared with backend limits) ─────────

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    maxDownloadsPerDay: 10,
    maxResolution: 720,
    features: ["10 downloads / day", "Up to 720p", "All platforms", "Video, image & audio"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    period: "/month",
    maxDownloadsPerDay: -1,
    maxResolution: 1080,
    features: [
      "Unlimited downloads",
      "Up to 1080p HD",
      "No ads",
      "Download history",
      "Priority speed",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$15",
    period: "/month",
    maxDownloadsPerDay: -1,
    maxResolution: 4320,
    features: [
      "Everything in Pro",
      "Up to 4K Ultra HD",
      "Batch downloads",
      "Priority queue",
      "Early access to new tools",
    ],
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

// ───────── Public config ─────────

export interface FeatureFlags {
  publicAccounts: boolean;
  publicPricing: boolean;
  publicDashboard: boolean;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  url: string;
  description: string;
  twitter: string;
  ogImage: string;
  locale: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface ThemeConfig {
  downloadButtonBg: string;
  downloadButtonText: string;
  heroGradientFrom: string;
  heroGradientTo: string;
  navbarTitleColor: string;
  navbarSuffixText: string;
  navbarSuffixUseGradient: boolean;
  navbarLogoSizePx: number;
  heroTitleColor: string;
  heroSubtitleColor: string;
  customCss?: string;
}

export interface SiteControls {
  siteOnline: boolean;
  downloadToolEnabled: boolean;
  maintenanceMessage: string;
}

export interface SeoDefaults {
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string[];
}

export interface RouteSeoOverride {
  id?: string;
  path: string;
  title?: string;
  description?: string;
  keywords?: string[];
  noindex?: boolean;
}

export interface MenuItemConfig {
  id: string;
  menu: "header" | "footer";
  label: string;
  href: string;
  column: number | null;
  order: number;
  parentId?: string | null;
  openInNew: boolean;
}

export interface AdConfig {
  placement: string;
  code: string;
}

export interface PageNavItem {
  slug: string;
  title: string;
  navLabel: string;
  showDownloadBar: boolean;
}

export interface PublicConfig {
  flags: FeatureFlags;
  site: SiteConfig;
  seoDefaults: SeoDefaults;
  theme?: ThemeConfig;
  siteOnline?: boolean;
  downloadToolEnabled?: boolean;
  maintenanceMessage?: string;
  gsc?: { verificationContent: string; googleAnalyticsId: string; customHeadHtml?: string };
  totalDownloads: number;
  menus: MenuItemConfig[];
  ads: AdConfig[];
  pages: PageNavItem[];
  toolOrder?: string[];
  routeSeo?: RouteSeoOverride[];
}

export interface CmsPage {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  sections: { heading?: string; body: string }[];
  showDownloadBar: boolean;
}

export type AdPlacement =
  | "header_banner"
  | "below_search"
  | "in_content"
  | "footer"
  | "popup"
  | "sticky_bar"
  | "direct_link"
  | "social_bar";

export interface AdSlotRecord {
  id: string;
  placement: AdPlacement;
  enabled: boolean;
  code: string;
}

export interface AdminMenuItem extends MenuItemConfig {
  createdAt?: string;
}

export interface AdminPageRecord {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  sections: { heading?: string; body: string }[];
  showDownloadBar: boolean;
  published: boolean;
  navLabel: string | null;
  order: number;
}

export function fetchPublicConfig(): Promise<PublicConfig> {
  return apiClient.get<PublicConfig>("/api/public/config");
}

export function fetchCmsPage(slug: string): Promise<CmsPage> {
  return apiClient.get<CmsPage>(`/api/public/pages/${slug}`);
}

// ───────── Auth ─────────

export function apiMe(): Promise<User | null> {
  return apiClient.get<User | null>("/api/auth/me");
}

export type LoginResponse =
  | User
  | { needsTotp: true; ticket: string; totpEnabled: true }
  | { needsTotpSetup: true; ticket: string; totpEnabled: false };

export function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>("/api/auth/login", { email, password });
}

export function apiLoginVerify(ticket: string, code: string): Promise<User> {
  return apiClient.post<User>("/api/auth/login/verify", { ticket, code });
}

export function apiTotpSetup(ticket: string): Promise<{ qrDataUrl: string; secret: string }> {
  return apiClient.post<{ qrDataUrl: string; secret: string }>("/api/auth/totp/setup", { ticket });
}

export function apiTotpEnable(ticket: string, code: string): Promise<User> {
  return apiClient.post<User>("/api/auth/totp/enable", { ticket, code });
}

export function apiRegister(name: string, email: string, password: string): Promise<User> {
  return apiClient.post<User>("/api/auth/register", { name, email, password });
}

export function apiLogout(): Promise<{ ok: boolean }> {
  return apiClient.post<{ ok: boolean }>("/api/auth/logout");
}

export function apiUpdateProfile(name: string): Promise<User> {
  return apiClient.patch<User>("/api/auth/me", { name });
}

export function apiUpgradePlan(planId: PlanId): Promise<User> {
  return apiClient.post<User>("/api/auth/me/plan", { planId });
}

// ───────── Downloads ─────────

export function getMyDownloads(): Promise<DownloadRecord[]> {
  return apiClient.get<DownloadRecord[]>("/api/downloads");
}

export async function getMyTodayCount(): Promise<number> {
  const res = await apiClient.get<{ count: number }>("/api/downloads/today-count");
  return res.count;
}

export function recordDownload(record: {
  title: string;
  platform: string;
  url: string;
  quality: string;
  thumbnail?: string;
}): Promise<DownloadRecord> {
  return apiClient.post<DownloadRecord>("/api/downloads", record);
}

// ───────── Favorites ─────────

export function getMyFavorites(): Promise<Favorite[]> {
  return apiClient.get<Favorite[]>("/api/favorites");
}

export async function toggleFavorite(data: {
  title: string;
  platform: string;
  url: string;
  thumbnail?: string;
}): Promise<boolean> {
  const res = await apiClient.post<{ favorited: boolean }>("/api/favorites", data);
  return res.favorited;
}

export function removeFavorite(favoriteId: string): Promise<{ ok: boolean }> {
  return apiClient.delete<{ ok: boolean }>(`/api/favorites/${favoriteId}`);
}

// ───────── Admin ─────────

export function adminGetUsers(): Promise<AdminUser[]> {
  return apiClient.get<AdminUser[]>("/api/admin/users");
}

export function adminUpdateUser(
  id: string,
  patch: Partial<Pick<User, "planId" | "role" | "banned" | "name" | "totpExempt">> & {
    password?: string;
  }
): Promise<User> {
  return apiClient.patch<User>(`/api/admin/users/${id}`, patch);
}

export function adminGetDownloads(): Promise<AdminDownload[]> {
  return apiClient.get<AdminDownload[]>("/api/admin/downloads");
}

export function adminGetAnalytics(): Promise<Analytics> {
  return apiClient.get<Analytics>("/api/admin/analytics");
}

export function adminCreateUser(data: {
  name: string;
  email: string;
  password: string;
  totpExempt?: boolean;
}): Promise<{ id: string; name: string; email: string; role: string }> {
  return apiClient.post("/api/admin/users", data);
}

export function adminDeleteUser(id: string): Promise<{ ok: boolean }> {
  return apiClient.delete(`/api/admin/users/${id}`);
}

export function adminGetSettings(): Promise<{
  flags: FeatureFlags;
  site: SiteConfig;
  seo: SeoDefaults;
  theme: ThemeConfig;
  routeSeo: RouteSeoOverride[];
}> {
  return apiClient.get("/api/admin/settings");
}

export function adminUpdateSettings(data: {
  flags?: Partial<FeatureFlags>;
  site?: Partial<SiteConfig>;
  seo?: Partial<SeoDefaults>;
  theme?: Partial<ThemeConfig>;
  routeSeo?: RouteSeoOverride[];
}): Promise<{ flags: FeatureFlags; site: SiteConfig; seo: SeoDefaults; theme: ThemeConfig; routeSeo: RouteSeoOverride[] }> {
  return apiClient.put("/api/admin/settings", data);
}

export function adminGetDeveloperControls(): Promise<SiteControls> {
  return apiClient.get<SiteControls>("/api/admin/developer/controls");
}

export function adminUpdateDeveloperControls(
  data: Partial<SiteControls>
): Promise<SiteControls> {
  return apiClient.put<SiteControls>("/api/admin/developer/controls", data);
}

export interface GscConfig {
  verificationContent: string;
  propertyUrl: string;
  googleAnalyticsId: string;
  customHeadHtml: string;
  lastSitemapPingAt: string | null;
  sitemapUrl?: string;
  activeTags?: ActiveHeadTag[];
}

export interface ActiveHeadTag {
  source: "gsc" | "ga4" | "custom";
  kind: string;
  label: string;
  snippet: string;
}

export function adminGetGsc(): Promise<GscConfig & { sitemapUrl: string; activeTags: ActiveHeadTag[] }> {
  return apiClient.get("/api/admin/gsc");
}

export function adminUpdateGsc(
  data: Partial<Pick<GscConfig, "verificationContent" | "propertyUrl" | "googleAnalyticsId" | "customHeadHtml">>
): Promise<GscConfig & { sitemapUrl: string; activeTags: ActiveHeadTag[] }> {
  return apiClient.put("/api/admin/gsc", data);
}

export function adminPingSitemap(): Promise<{
  ok: boolean;
  status: number;
  sitemapUrl: string;
  lastSitemapPingAt: string;
}> {
  return apiClient.post("/api/admin/gsc/ping-sitemap", {});
}

export function adminUploadImage(
  image: string,
  kind: "logo" | "favicon" | "og" | "general"
): Promise<{ url: string; path: string }> {
  return apiClient.post("/api/admin/uploads", { image, kind });
}

export function adminGetAds(): Promise<AdSlotRecord[]> {
  return apiClient.get<AdSlotRecord[]>("/api/admin/ads");
}

export function adminUpdateAd(
  placement: AdPlacement,
  data: { enabled?: boolean; code?: string }
): Promise<AdSlotRecord> {
  return apiClient.put<AdSlotRecord>(`/api/admin/ads/${placement}`, data);
}

export function adminGetMenus(): Promise<AdminMenuItem[]> {
  return apiClient.get<AdminMenuItem[]>("/api/admin/menus");
}

export function adminCreateMenuItem(data: Omit<AdminMenuItem, "id">): Promise<AdminMenuItem> {
  return apiClient.post<AdminMenuItem>("/api/admin/menus", data);
}

export function adminUpdateMenuItem(
  id: string,
  data: Partial<AdminMenuItem>
): Promise<AdminMenuItem> {
  return apiClient.patch<AdminMenuItem>(`/api/admin/menus/${id}`, data);
}

export function adminDeleteMenuItem(id: string): Promise<{ ok: boolean }> {
  return apiClient.delete(`/api/admin/menus/${id}`);
}

export function adminResetDefaultMenus(): Promise<AdminMenuItem[]> {
  return apiClient.post<AdminMenuItem[]>("/api/admin/menus/reset-defaults");
}

export function adminGetPages(): Promise<AdminPageRecord[]> {
  return apiClient.get<AdminPageRecord[]>("/api/admin/pages");
}

export function adminCreatePage(
  data: Omit<AdminPageRecord, "id">
): Promise<AdminPageRecord> {
  return apiClient.post<AdminPageRecord>("/api/admin/pages", data);
}

export function adminUpdatePage(
  id: string,
  data: Partial<AdminPageRecord>
): Promise<AdminPageRecord> {
  return apiClient.patch<AdminPageRecord>(`/api/admin/pages/${id}`, data);
}

export function adminDeletePage(id: string): Promise<{ ok: boolean }> {
  return apiClient.delete(`/api/admin/pages/${id}`);
}

export function adminResetStats(keepDays = 7): Promise<{ ok: boolean }> {
  return apiClient.post("/api/admin/stats/reset", { keepDays });
}

export function adminPurgeStorage(): Promise<{ removedDirs: number }> {
  return apiClient.post("/api/admin/storage/purge");
}

export interface CountryProxy {
  country: string;
  label: string;
  proxy: string;
  enabled: boolean;
}

export interface YtdlpGeoConfig {
  geoBypass: boolean;
  defaultCountry: string;
  proxy: string;
  cookiesFile: string;
  countryProxies: CountryProxy[];
  instagramCookiesConfigured?: boolean;
  generalCookiesConfigured?: boolean;
}

export function adminGetGeo(): Promise<YtdlpGeoConfig> {
  return apiClient.get<YtdlpGeoConfig>("/api/admin/geo");
}

export function adminUpdateGeo(data: YtdlpGeoConfig): Promise<YtdlpGeoConfig> {
  return apiClient.put<YtdlpGeoConfig>("/api/admin/geo", data);
}

export function adminTestGeo(
  url: string,
  country?: string
): Promise<{
  ok: boolean;
  title?: string;
  extractor?: string;
  duration?: string;
  optionsCount?: number;
  country?: string;
  error?: string;
}> {
  return apiClient.post("/api/admin/geo/test", { url, country });
}

export function adminUploadInstagramCookies(content: string): Promise<{ ok: boolean; configured: boolean }> {
  return apiClient.post("/api/admin/geo/cookies/instagram", { content });
}

export function adminGetToolOrder(): Promise<{ slugs: string[] }> {
  return apiClient.get("/api/admin/tools/order");
}

export function adminUpdateToolOrder(slugs: string[]): Promise<{ slugs: string[] }> {
  return apiClient.put("/api/admin/tools/order", { slugs });
}

// ───────── Guest download quota (local, no account) ─────────
/* Guests aren't tracked server-side; we keep a small per-day local tally
   so the free-tier limit still applies before sign-up. */

const GUEST_KEY = "dhp_guest_downloads";

interface GuestTally {
  date: string; // YYYY-MM-DD
  count: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getGuestTodayCount(): number {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return 0;
    const tally: GuestTally = JSON.parse(raw);
    return tally.date === todayKey() ? tally.count : 0;
  } catch {
    return 0;
  }
}

export function addGuestDownload(): void {
  const current = getGuestTodayCount();
  const tally: GuestTally = { date: todayKey(), count: current + 1 };
  localStorage.setItem(GUEST_KEY, JSON.stringify(tally));
}
