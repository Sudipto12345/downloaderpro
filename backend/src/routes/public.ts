import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { getFlags, getGscConfig, getSeoDefaults, getSiteConfig, getSiteControls, getThemeConfig, getTotalDownloads } from "../lib/settings.js";
import { recordAdClick, recordAdImpression, recordPageView } from "../lib/stats.js";
import { getToolOrder } from "../lib/toolsOrder.js";

export const publicRouter = Router();

/** Public site config — no auth required. */
publicRouter.get("/config", async (_req, res) => {
  const [flags, site, seoDefaults, theme, siteControls, gsc, totalDownloads, menus, ads, pages, toolOrder] =
    await Promise.all([
    getFlags(),
    getSiteConfig(),
    getSeoDefaults(),
    getThemeConfig(),
    getSiteControls(),
    getGscConfig(),
    getTotalDownloads(),
    prisma.menuItem.findMany({ orderBy: [{ menu: "asc" }, { order: "asc" }] }),
    prisma.adSlot.findMany({ where: { enabled: true } }),
    prisma.page.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      select: {
        slug: true,
        title: true,
        navLabel: true,
        showDownloadBar: true,
      },
    }),
    getToolOrder(),
  ]);

  return res.json({
    flags,
    site,
    seoDefaults,
    theme,
    siteOnline: siteControls.siteOnline,
    downloadToolEnabled: siteControls.downloadToolEnabled,
    maintenanceMessage: siteControls.maintenanceMessage,
    gsc: {
      verificationContent: gsc.verificationContent,
      googleAnalyticsId: gsc.googleAnalyticsId,
      customHeadHtml: gsc.customHeadHtml,
    },
    totalDownloads,
    menus: menus.map((m) => ({
      id: m.id,
      menu: m.menu,
      label: m.label,
      href: m.href,
      column: m.column,
      order: m.order,
      parentId: m.parentId ?? null,
      openInNew: m.openInNew,
    })),
    ads: ads.map((a) => ({
      placement: a.placement,
      code: a.code,
    })),
    pages: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      navLabel: p.navLabel ?? p.title,
      showDownloadBar: p.showDownloadBar,
    })),
    toolOrder,
  });
});

/** Plain-text GSC verification token for nginx entrypoint injection. */
publicRouter.get("/gsc-verification", async (_req, res) => {
  const gsc = await getGscConfig();
  const content = (gsc.verificationContent ?? "").trim();
  if (!content) return res.status(204).end();
  res.type("text/plain").send(content);
});

/** Raw custom head HTML for nginx entrypoint injection. */
publicRouter.get("/custom-head-html", async (_req, res) => {
  const gsc = await getGscConfig();
  const html = (gsc.customHeadHtml ?? "").trim();
  if (!html) return res.status(204).end();
  res.type("text/html").send(html);
});

/** Fetch a single published CMS page by slug. */
publicRouter.get("/pages/:slug", async (req, res) => {
  const page = await prisma.page.findFirst({
    where: { slug: req.params.slug, published: true },
  });
  if (!page) {
    return res.status(404).json({ error: "Page not found." });
  }
  return res.json({
    slug: page.slug,
    title: page.title,
    metaDescription: page.metaDescription,
    keywords: page.keywords,
    intro: page.intro,
    sections: page.sections,
    showDownloadBar: page.showDownloadBar,
  });
});

const trackSchema = z.object({
  type: z.enum(["pageview", "ad_impression", "ad_click"]),
  path: z.string().max(500).optional(),
  placement: z.string().max(80).optional(),
});

/** Lightweight analytics beacon — no auth. */
publicRouter.post("/track", async (req, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid track payload." });
  }
  const { type, placement } = parsed.data;
  try {
    if (type === "pageview") await recordPageView();
    else if (type === "ad_impression" && placement) await recordAdImpression(placement);
    else if (type === "ad_click" && placement) await recordAdClick(placement);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to record event." });
  }
});
