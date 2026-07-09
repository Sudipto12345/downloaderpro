import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AdPlacement, MenuType } from "@prisma/client";
import { prisma } from "../db.js";
import { getDailyStats, getAdPlacementStats, getTrafficTotals, resetStats } from "../lib/stats.js";
import { getFlags, getGscConfig, getRouteSeoOverrides, getSeoDefaults, getSiteConfig, getSiteControls, getThemeConfig, getTotalDownloads, setRouteSeoOverrides, setSetting, getSitemapOverrides, setSitemapOverrides } from "../lib/settings.js";
import { saveImageUpload, toPublicUploadUrl } from "../lib/uploads.js";
import { isDeveloperUser, isHiddenAdmin, isMainAdmin } from "../lib/users.js";
import { requireDeveloper } from "../middleware/auth.js";
import { getTempStorageInfo, purgeTempStorage } from "../lib/storage.js";
import { getYtdlpGeoConfig, setYtdlpGeoConfig, type YtdlpGeoConfig } from "../lib/ytdlpConfig.js";
import { invalidateNetworkRouteCache } from "../lib/networkRoute.js";
import { getInfo, getYtdlpVersion, getFfmpegVersion } from "../services/ytdlp.js";
import { requireAdmin } from "../middleware/auth.js";
import { DEFAULT_TOOL_SLUGS, getToolOrder, setToolOrder } from "../lib/toolsOrder.js";
import { normalizeGscPayload } from "../lib/gsc.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

function isSuperAdminUser(user: { email: string; isSuperAdmin: boolean }): boolean {
  return isMainAdmin(user);
}

/* ── Users ─────────────────────────────────────────────────────── */

adminRouter.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { downloads: true } } },
  });
  const visible = users.filter((u) => !isHiddenAdmin(u));
  return res.json(
    visible.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      planId: u.planId,
      banned: u.banned,
      isSuperAdmin: isSuperAdminUser(u),
      totpEnabled: u.totpEnabled,
      totpExempt: u.totpExempt,
      createdAt: u.createdAt.toISOString(),
      downloadCount: u._count.downloads,
    }))
  );
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(8).max(200).optional(),
  planId: z.enum(["free", "pro", "business"]).optional(),
  role: z.enum(["guest", "user", "premium", "admin"]).optional(),
  banned: z.boolean().optional(),
  totpExempt: z.boolean().optional(),
});

adminRouter.patch("/users/:id", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update payload." });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found." });
  if (isHiddenAdmin(target) && !isDeveloperUser(req.user!)) {
    return res.status(404).json({ error: "User not found." });
  }

  if (isSuperAdminUser(target)) {
    if (parsed.data.banned === true) {
      return res.status(403).json({ error: "Super-admin cannot be suspended." });
    }
    if (parsed.data.role && parsed.data.role !== "admin") {
      return res.status(403).json({ error: "Super-admin role cannot be changed." });
    }
  }

  try {
    const { password, name, planId, role, banned, totpExempt } = parsed.data;
    const data: {
      name?: string;
      planId?: "free" | "pro" | "business";
      role?: "guest" | "user" | "premium" | "admin";
      banned?: boolean;
      totpExempt?: boolean;
      passwordHash?: string;
      totpEnabled?: boolean;
      totpSecret?: string | null;
    } = {};
    if (name !== undefined) data.name = name;
    if (planId !== undefined) data.planId = planId;
    if (role !== undefined) data.role = role;
    if (banned !== undefined) data.banned = banned;
    if (totpExempt !== undefined) {
      data.totpExempt = totpExempt;
      if (totpExempt) {
        data.totpEnabled = false;
        data.totpSecret = null;
      }
    }
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
    });
    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      planId: updated.planId,
      banned: updated.banned,
      isSuperAdmin: isSuperAdminUser(updated),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch {
    return res.status(404).json({ error: "User not found." });
  }
});

const createAdminSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
  totpExempt: z.boolean().optional(),
});

adminRouter.post("/users", async (req, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid admin user data." });
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use." });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: "admin",
      planId: "business",
      totpExempt: parsed.data.totpExempt ?? true,
      totpEnabled: false,
    },
  });
  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    totpEnabled: false,
  });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found." });
  if (isHiddenAdmin(target)) {
    return res.status(404).json({ error: "User not found." });
  }
  if (isMainAdmin(target)) {
    return res.status(403).json({ error: "Main administrator cannot be deleted." });
  }
  if (target.id === req.user!.id) {
    return res.status(403).json({ error: "You cannot delete your own account." });
  }
  await prisma.user.delete({ where: { id: target.id } });
  return res.json({ ok: true });
});

/* ── Downloads (legacy per-user logs) ───────────────────────────── */

adminRouter.get("/downloads", async (_req, res) => {
  const downloads = await prisma.download.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { email: true } } },
  });
  return res.json(
    downloads.map((d) => ({
      id: d.id,
      userId: d.userId,
      userEmail: d.user.email,
      title: d.title,
      platform: d.platform,
      url: d.url,
      quality: d.quality,
      thumbnail: d.thumbnail ?? undefined,
      date: d.createdAt.toISOString(),
    }))
  );
});

/* ── Analytics (global counter) ────────────────────────────────── */

adminRouter.get("/analytics", async (_req, res) => {
  const [totalDownloads, dailyMetrics, users, storage, traffic, adPlacementStats, ads, flags] =
    await Promise.all([
      getTotalDownloads(),
      getDailyStats(7),
      prisma.user.findMany({ select: { role: true, planId: true } }),
      getTempStorageInfo(),
      getTrafficTotals(),
      getAdPlacementStats(),
      prisma.adSlot.findMany({ select: { placement: true, enabled: true } }),
      getFlags(),
    ]);

  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = dailyMetrics.find((d) => d.date === todayKey);

  const adStats = ads.map((slot) => ({
    placement: slot.placement,
    enabled: slot.enabled,
    clicks: adPlacementStats[slot.placement]?.clicks ?? 0,
    impressions: adPlacementStats[slot.placement]?.impressions ?? 0,
  }));

  return res.json({
    totalUsers: users.filter((u: { role: string }) => u.role !== "admin").length,
    totalDownloads,
    downloadsToday: today?.downloads ?? 0,
    dailyCounts: dailyMetrics.map((d) => ({ date: d.date, count: d.downloads })),
    dailyMetrics,
    totalPageViews: traffic.totalPageViews,
    pageViewsToday: today?.pageViews ?? 0,
    totalAdClicks: traffic.totalAdClicks,
    adClicksToday: today?.adClicks ?? 0,
    totalAdImpressions: traffic.totalAdImpressions,
    adImpressionsToday: today?.adImpressions ?? 0,
    adStats,
    enabledAds: ads.filter((a) => a.enabled).length,
    storage,
    planDistribution: {
      free: users.filter((u: { planId: string }) => u.planId === "free").length,
      pro: users.filter((u: { planId: string }) => u.planId === "pro").length,
      business: users.filter((u: { planId: string }) => u.planId === "business").length,
    },
    system: {
      database,
      api: true,
    },
  });
});

adminRouter.post("/stats/reset", async (req, res) => {
  const keepDays = Number(req.body?.keepDays ?? 7);
  await resetStats(keepDays);
  return res.json({ ok: true });
});

adminRouter.post("/storage/purge", async (_req, res) => {
  const result = purgeTempStorage();
  return res.json(result);
});

/* ── Settings / flags / SEO ────────────────────────────────────── */

adminRouter.get("/settings", async (_req, res) => {
  const [flags, site, seo, theme, routeSeo] = await Promise.all([
    getFlags(),
    getSiteConfig(),
    getSeoDefaults(),
    getThemeConfig(),
    getRouteSeoOverrides(),
  ]);
  return res.json({ flags, site, seo, theme, routeSeo });
});

const settingsSchema = z.object({
  flags: z
    .object({
      publicAccounts: z.boolean().optional(),
      publicPricing: z.boolean().optional(),
      publicDashboard: z.boolean().optional(),
    })
    .optional(),
  site: z
    .object({
      name: z.string().optional(),
      shortName: z.string().optional(),
      url: z.string().optional(),
      description: z.string().optional(),
      twitter: z.string().optional(),
      ogImage: z.string().optional(),
      locale: z.string().optional(),
      logoUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
    })
    .optional(),
  seo: z
    .object({
      defaultTitle: z.string().optional(),
      defaultDescription: z.string().optional(),
      defaultKeywords: z.array(z.string()).optional(),
    })
    .optional(),
  theme: z
    .object({
      downloadButtonBg: z.string().optional(),
      downloadButtonText: z.string().optional(),
      heroGradientFrom: z.string().optional(),
      heroGradientTo: z.string().optional(),
      navbarTitleColor: z.string().optional(),
      navbarSuffixText: z.string().optional(),
      navbarSuffixUseGradient: z.boolean().optional(),
      navbarLogoSizePx: z.number().int().min(24).max(80).optional(),
      heroTitleColor: z.string().optional(),
      heroSubtitleColor: z.string().optional(),
      customCss: z.string().max(50_000).optional(),
    })
    .optional(),
  routeSeo: z
    .array(
      z.object({
        id: z.string().optional(),
        path: z.string().trim().min(1).max(200),
        title: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
        keywords: z.array(z.string()).optional(),
        noindex: z.boolean().optional(),
      })
    )
    .optional(),
});

adminRouter.put("/settings", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid settings." });
  }
  if (parsed.data.flags) {
    const current = await getFlags();
    await setSetting("flags", { ...current, ...parsed.data.flags });
  }
  if (parsed.data.site) {
    const current = await getSiteConfig();
    await setSetting("site", { ...current, ...parsed.data.site });
  }
  if (parsed.data.seo) {
    const current = await getSeoDefaults();
    await setSetting("seo", { ...current, ...parsed.data.seo });
  }
  if (parsed.data.theme) {
    const current = await getThemeConfig();
    await setSetting("theme", { ...current, ...parsed.data.theme });
  }
  if (parsed.data.routeSeo) {
    await setRouteSeoOverrides(parsed.data.routeSeo);
  }
  const [flags, site, seo, theme, routeSeo] = await Promise.all([
    getFlags(),
    getSiteConfig(),
    getSeoDefaults(),
    getThemeConfig(),
    getRouteSeoOverrides(),
  ]);
  return res.json({ flags, site, seo, theme, routeSeo });
});

/* ── Ads ───────────────────────────────────────────────────────── */

adminRouter.get("/ads", async (_req, res) => {
  const slots = await prisma.adSlot.findMany({ orderBy: { placement: "asc" } });
  return res.json(slots);
});

const adUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  code: z.string().optional(),
});

adminRouter.put("/ads/:placement", async (req, res) => {
  const placement = req.params.placement as AdPlacement;
  if (!Object.values(AdPlacement).includes(placement)) {
    return res.status(400).json({ error: "Invalid ad placement." });
  }
  const parsed = adUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid ad data." });
  }
  const updated = await prisma.adSlot.update({
    where: { placement },
    data: parsed.data,
  });
  return res.json(updated);
});

/* ── Menus ─────────────────────────────────────────────────────── */

adminRouter.get("/menus", async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    orderBy: [{ menu: "asc" }, { order: "asc" }],
  });
  return res.json(items);
});

const menuItemSchema = z.object({
  menu: z.enum(["header", "footer"]),
  label: z.string().trim().min(1).max(120),
  href: z.string().trim().min(1).max(500),
  column: z.number().int().nullable().optional(),
  order: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
  openInNew: z.boolean().optional(),
});

adminRouter.post("/menus", async (req, res) => {
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid menu item." });
  }
  const item = await prisma.menuItem.create({
    data: {
      menu: parsed.data.menu as MenuType,
      label: parsed.data.label,
      href: parsed.data.href,
      column: parsed.data.column ?? null,
      order: parsed.data.order ?? 0,
      parentId: parsed.data.parentId ?? null,
      openInNew: parsed.data.openInNew ?? false,
    },
  });
  return res.status(201).json(item);
});

adminRouter.patch("/menus/:id", async (req, res) => {
  const parsed = menuItemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid menu item." });
  }
  try {
    const updated = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    return res.json(updated);
  } catch {
    return res.status(404).json({ error: "Menu item not found." });
  }
});

adminRouter.delete("/menus/:id", async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ error: "Menu item not found." });
  }
});

/* ── CMS Pages ─────────────────────────────────────────────────── */

adminRouter.get("/pages", async (_req, res) => {
  const pages = await prisma.page.findMany({ orderBy: { order: "asc" } });
  return res.json(pages);
});

const pageSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(200),
  metaDescription: z.string().max(500).optional(),
  keywords: z.array(z.string()).optional(),
  intro: z.string().max(2000).optional(),
  sections: z
    .array(z.object({ heading: z.string().optional(), body: z.string() }))
    .optional(),
  showDownloadBar: z.boolean().optional(),
  published: z.boolean().optional(),
  navLabel: z.string().max(120).nullable().optional(),
  order: z.number().int().optional(),
});

adminRouter.post("/pages", async (req, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid page data." });
  }
  const existing = await prisma.page.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return res.status(409).json({ error: "Slug already exists." });
  }
  const page = await prisma.page.create({
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      metaDescription: parsed.data.metaDescription ?? "",
      keywords: parsed.data.keywords ?? [],
      intro: parsed.data.intro ?? "",
      sections: parsed.data.sections ?? [],
      showDownloadBar: parsed.data.showDownloadBar ?? false,
      published: parsed.data.published ?? true,
      navLabel: parsed.data.navLabel ?? null,
      order: parsed.data.order ?? 0,
    },
  });
  return res.status(201).json(page);
});

adminRouter.patch("/pages/:id", async (req, res) => {
  const parsed = pageSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid page data." });
  }
  try {
    const updated = await prisma.page.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        sections: parsed.data.sections ?? undefined,
      },
    });
    return res.json(updated);
  } catch {
    return res.status(404).json({ error: "Page not found." });
  }
});

adminRouter.delete("/pages/:id", async (req, res) => {
  try {
    await prisma.page.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ error: "Page not found." });
  }
});

/* ── Geo / country-wise download settings ──────────────────────── */

adminRouter.get("/geo", async (_req, res) => {
  const config = await getYtdlpGeoConfig();
  const { instagramCookiesConfigured, generalCookiesConfigured } = await import("../lib/cookiesStore.js");
  return res.json({
    ...config,
    instagramCookiesConfigured: instagramCookiesConfigured(),
    generalCookiesConfigured: generalCookiesConfigured(config.cookiesFile),
  });
});

const countryProxySchema = z.object({
  country: z.string().length(2),
  label: z.string().min(1).max(80),
  proxy: z.string().max(500),
  enabled: z.boolean(),
});

const geoSchema = z.object({
  geoBypass: z.boolean(),
  defaultCountry: z.string().length(2),
  proxy: z.string().max(500),
  cookiesFile: z.string().max(500),
  countryProxies: z.array(countryProxySchema),
});

adminRouter.put("/geo", async (req, res) => {
  const parsed = geoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid geo configuration." });
  }
  await setYtdlpGeoConfig(parsed.data as YtdlpGeoConfig);
  invalidateNetworkRouteCache();
  return res.json(await getYtdlpGeoConfig());
});

adminRouter.post("/geo/test", async (req, res) => {
  const url = String(req.body?.url ?? "").trim();
  if (!url) {
    return res.status(400).json({ error: "URL is required." });
  }
  const country = String(req.body?.country ?? "").trim().toUpperCase();
  try {
    const geo = await getYtdlpGeoConfig();
    const info = await getInfo(url, country || geo.defaultCountry);
    return res.json({
      ok: true,
      title: info.title,
      extractor: info.extractor,
      duration: info.duration,
      optionsCount: info.options.length,
      country: country || geo.defaultCountry,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test failed.";
    return res.status(400).json({ ok: false, error: message });
  }
});

const instagramCookiesSchema = z.object({
  content: z.string().min(32).max(512_000),
});

adminRouter.post("/geo/cookies/instagram", async (req, res) => {
  const parsed = instagramCookiesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid cookies file." });
  }
  try {
    const { saveInstagramCookies } = await import("../lib/cookiesStore.js");
    await saveInstagramCookies(parsed.data.content);
    invalidateNetworkRouteCache();
    return res.json({ ok: true, configured: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save cookies.";
    return res.status(400).json({ error: message });
  }
});

/* ── Image uploads (admin) ─────────────────────────────────────── */

const uploadSchema = z.object({
  image: z.string().min(32).max(6_000_000),
  kind: z.enum(["logo", "favicon", "og", "general"]),
});

adminRouter.post("/uploads", async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid image upload." });
  }
  try {
    const relative = await saveImageUpload(parsed.data.image, parsed.data.kind);
    const url = toPublicUploadUrl(relative);
    return res.status(201).json({ url, path: relative });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return res.status(400).json({ error: message });
  }
});

/* ── Tool order ─────────────────────────────────────────────────── */

adminRouter.get("/tools/order", async (_req, res) => {
  return res.json({ slugs: await getToolOrder() });
});

const toolOrderSchema = z.object({
  slugs: z.array(z.string().min(1).max(120)),
});

adminRouter.put("/tools/order", async (req, res) => {
  const parsed = toolOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid tool order." });
  }
  const slugs = await setToolOrder(parsed.data.slugs);
  return res.json({ slugs, defaults: DEFAULT_TOOL_SLUGS });
});

/* ── Google Search Console ───────────────────────────────────────── */

const gscSchema = z.object({
  verificationContent: z.string().optional(),
  propertyUrl: z.string().trim().max(300).optional(),
  googleAnalyticsId: z.string().max(40).optional(),
  customHeadHtml: z.string().max(512_000).optional(),
});

adminRouter.get("/gsc", async (_req, res) => {
  const [gsc, site] = await Promise.all([getGscConfig(), getSiteConfig()]);
  const sitemapUrl = `${site.url.replace(/\/$/, "")}/sitemap.xml`;
  const { buildActiveHeadTags } = await import("../lib/headTags.js");
  return res.json({ ...gsc, sitemapUrl, activeTags: buildActiveHeadTags(gsc) });
});

adminRouter.put("/gsc", async (req, res) => {
  const parsed = gscSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid Search Console settings." });
  }
  const current = await getGscConfig();
  const normalized = normalizeGscPayload(parsed.data);
  await setSetting("gsc", { ...current, ...normalized });
  const site = await getSiteConfig();
  const updated = await getGscConfig();
  const { buildActiveHeadTags } = await import("../lib/headTags.js");
  return res.json({
    ...updated,
    sitemapUrl: `${site.url.replace(/\/$/, "")}/sitemap.xml`,
    activeTags: buildActiveHeadTags(updated),
  });
});

adminRouter.post("/gsc/ping-sitemap", async (_req, res) => {
  const site = await getSiteConfig();
  const sitemapUrl = `${site.url.replace(/\/$/, "")}/sitemap.xml`;
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const pingRes = await fetch(pingUrl);
    const now = new Date().toISOString();
    const current = await getGscConfig();
    await setSetting("gsc", { ...current, lastSitemapPingAt: now });
    return res.json({
      ok: pingRes.ok,
      status: pingRes.status,
      sitemapUrl,
      lastSitemapPingAt: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ping failed.";
    return res.status(502).json({ error: message });
  }
});

/* ── Developer-only controls (hidden route) ───────────────────── */

const siteControlsSchema = z.object({
  siteOnline: z.boolean().optional(),
  downloadToolEnabled: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
});

adminRouter.get("/developer/controls", requireDeveloper, async (_req, res) => {
  return res.json(await getSiteControls());
});

adminRouter.put("/developer/controls", requireDeveloper, async (req, res) => {
  const parsed = siteControlsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid controls." });
  }
  const current = await getSiteControls();
  await setSetting("siteControls", { ...current, ...parsed.data });
  return res.json(await getSiteControls());
});

/* ── Sitemap URL overrides ──────────────────────────────────────── */

adminRouter.get("/sitemap-overrides", async (_req, res) => {
  return res.json(await getSitemapOverrides());
});

const sitemapOverrideItemSchema = z.object({
  loc: z.string().trim().min(1).max(500),
  lastmod: z.string().max(20).optional(),
  changefreq: z
    .enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"])
    .optional(),
  priority: z.string().max(10).optional(),
  title: z.string().max(300).optional(),
});

const sitemapOverridesSchema = z.object({
  overrides: z.array(sitemapOverrideItemSchema).max(500),
});

adminRouter.put("/sitemap-overrides", async (req, res) => {
  const parsed = sitemapOverridesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid sitemap overrides." });
  }
  await setSitemapOverrides(parsed.data.overrides);
  return res.json(await getSitemapOverrides());
});

adminRouter.get("/sitemap-preview", async (_req, res) => {
  const { buildSitemapXml } = await import("../lib/sitemap.js");
  const xml = await buildSitemapXml();
  res.type("application/xml").send(xml);
});

adminRouter.get("/system-info", async (_req, res) => {
  try {
    const ytdlpVer = await getYtdlpVersion();
    const ffmpegVer = await getFfmpegVersion();
    return res.json({
      appVersion: "v1.2.0",
      ytdlpVersion: ytdlpVer,
      ffmpegVersion: ffmpegVer,
      nodeVersion: process.version,
      platform: process.platform,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load system info." });
  }
});

