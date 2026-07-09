import { prisma } from "../db.js";

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
  logoUrl: string;
  faviconUrl: string;
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

/** Public-site appearance — editable from admin Appearance tab. */
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
  /** Optional site-wide custom CSS injected on the public site. */
  customCss: string;
}

export interface SiteControls {
  siteOnline: boolean;
  downloadToolEnabled: boolean;
  maintenanceMessage: string;
}

/** Google Search Console & indexing helpers. */
export interface GscConfig {
  /** HTML tag verification `content` value from Search Console. */
  verificationContent: string;
  /** Full property URL, e.g. https://tinydown.com/ */
  propertyUrl: string;
  googleAnalyticsId: string;
  /** Raw HTML head tags (meta, link, script) — no count limit. */
  customHeadHtml: string;
  lastSitemapPingAt: string | null;
}

const DEFAULT_THEME: ThemeConfig = {
  downloadButtonBg: "hsl(233.5, 100%, 48.8%)",
  downloadButtonText: "#ffffff",
  heroGradientFrom: "hsl(261.8, 100%, 37.3%)",
  heroGradientTo: "hsl(303.8, 100%, 50%)",
  navbarTitleColor: "",
  navbarSuffixText: "",
  navbarSuffixUseGradient: true,
  navbarLogoSizePx: 36,
  heroTitleColor: "#ffffff",
  heroSubtitleColor: "rgba(255,255,255,0.85)",
  customCss: "",
};

const DEFAULT_SITE_CONTROLS: SiteControls = {
  siteOnline: true,
  downloadToolEnabled: true,
  maintenanceMessage: "We are performing maintenance. Please check back soon.",
};

const DEFAULT_GSC: GscConfig = {
  verificationContent: "",
  propertyUrl: "https://tinydown.com/",
  googleAnalyticsId: "",
  customHeadHtml: "",
  lastSitemapPingAt: null,
};

const DEFAULT_FLAGS: FeatureFlags = {
  publicAccounts: false,
  publicPricing: false,
  publicDashboard: false,
};

const DEFAULT_SITE: SiteConfig = {
  name: "TinyDown",
  shortName: "TinyDown",
  url: "https://tinydown.com",
  description: "Download videos and audio from your favourite platforms.",
  twitter: "@tinydown",
  ogImage: "/og-image.png",
  locale: "en_US",
  logoUrl: "",
  faviconUrl: "",
};

const DEFAULT_SEO: SeoDefaults = {
  defaultTitle: "TinyDown — Download Video, Image & Audio",
  defaultDescription: "Download videos and audio from 1000+ sites.",
  defaultKeywords: ["video downloader", "tinydown"],
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

export async function getFlags(): Promise<FeatureFlags> {
  const raw = await getSetting<Partial<FeatureFlags>>("flags", DEFAULT_FLAGS);
  return { ...DEFAULT_FLAGS, ...raw };
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const raw = await getSetting<Partial<SiteConfig>>("site", DEFAULT_SITE);
  return { ...DEFAULT_SITE, ...raw };
}

export async function getSeoDefaults(): Promise<SeoDefaults> {
  return getSetting("seo", DEFAULT_SEO);
}

export async function getThemeConfig(): Promise<ThemeConfig> {
  const raw = await getSetting<Partial<ThemeConfig>>("theme", DEFAULT_THEME);
  return { ...DEFAULT_THEME, ...raw };
}

export async function getRouteSeoOverrides(): Promise<RouteSeoOverride[]> {
  const raw = await getSetting<RouteSeoOverride[] | null>("routeSeo", []);
  return (raw ?? []).filter((entry) => entry && typeof entry.path === "string");
}

export async function setRouteSeoOverrides(overrides: RouteSeoOverride[]): Promise<void> {
  await setSetting("routeSeo", overrides);
}

export async function getSiteControls(): Promise<SiteControls> {
  const raw = await getSetting<Partial<SiteControls>>("siteControls", DEFAULT_SITE_CONTROLS);
  return { ...DEFAULT_SITE_CONTROLS, ...raw };
}

export async function getGscConfig(): Promise<GscConfig> {
  const raw = await getSetting<Partial<GscConfig>>("gsc", DEFAULT_GSC);
  const site = await getSiteConfig();
  return {
    ...DEFAULT_GSC,
    ...raw,
    propertyUrl: raw.propertyUrl || `${site.url.replace(/\/$/, "")}/`,
  };
}

export { DEFAULT_THEME, DEFAULT_SITE_CONTROLS, DEFAULT_GSC };

export async function getTotalDownloads(): Promise<number> {
  const val = await getSetting<number | { count?: number }>("totalDownloads", 0);
  if (typeof val === "number") return val;
  return (val as { count?: number }).count ?? 0;
}

export async function isPublicAccountsEnabled(): Promise<boolean> {
  const flags = await getFlags();
  return flags.publicAccounts;
}

/* ── Sitemap URL Overrides ───────────────────────────────────────── */

export interface SitemapUrlOverride {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  title?: string;
}

export async function getSitemapOverrides(): Promise<SitemapUrlOverride[]> {
  const raw = await getSetting<SitemapUrlOverride[] | null>("sitemapOverrides", []);
  return (raw ?? []).filter((e) => e && typeof e.loc === "string");
}

export async function setSitemapOverrides(overrides: SitemapUrlOverride[]): Promise<void> {
  await setSetting("sitemapOverrides", overrides);
}
