import { prisma } from "../db.js";
import { getSiteConfig, getSitemapOverrides } from "./settings.js";
import { DEFAULT_TOOL_SLUGS, getToolOrder } from "./toolsOrder.js";

/** Human-readable tool names for sitemap <title> hints (used by some crawlers) */
const TOOL_TITLES: Record<string, string> = {
  "video-downloader": "Video Downloader",
  "youtube-downloader": "Youtube Video Downloader",
  "tiktok-downloader": "TikTok Video Downloader",
  "instagram-downloader": "Instagram Video Downloader",
  "facebook-downloader": "Facebook Video Downloader",
  "twitter-downloader": "X/Twitter Video Downloader",
  "reddit-downloader": "Reddit Video Downloader",
  "vimeo-downloader": "Vimeo Video Downloader",
  "dailymotion-downloader": "Dailymotion Video Downloader",
  "twitch-downloader": "Twitch Video Downloader",
};

function toolPath(slug: string): string {
  return slug === "video-downloader" ? "/" : `/${slug}`;
}

export async function buildSitemapXml(): Promise<string> {
  const site = await getSiteConfig();
  const base = site.url.replace(/\/$/, "");
  const siteName = site.shortName || site.name;

  const [toolSlugs, cmsPages, overrides] = await Promise.all([
    getToolOrder(),
    prisma.page.findMany({
      where: { published: true },
      select: { slug: true, title: true, updatedAt: true },
      orderBy: { order: "asc" },
    }),
    getSitemapOverrides(),
  ]);

  const toolSlugsSet = new Set(DEFAULT_TOOL_SLUGS);

  type SitemapEntry = {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: string;
    title?: string;
  };

  const urls: SitemapEntry[] = [
    {
      loc: `${base}/`,
      changefreq: "daily",
      priority: "1.0",
      title: `${siteName} - Video Downloader`,
    },
    {
      loc: `${base}/tools`,
      changefreq: "weekly",
      priority: "0.7",
      title: `${siteName} - All Downloader Tools`,
    },
  ];

  for (const slug of toolSlugs) {
    if (!toolSlugsSet.has(slug)) continue;
    const path = toolPath(slug);
    if (path === "/") continue; // homepage already added above
    const toolTitle = TOOL_TITLES[slug];
    urls.push({
      loc: `${base}${path}`,
      changefreq: "weekly",
      priority: "0.9",
      title: toolTitle ? `${siteName} - ${toolTitle}` : undefined,
    });
  }

  const seen = new Set(urls.map((u) => u.loc));

  // CMS pages (includes hidden pages not in nav)
  for (const page of cmsPages) {
    const loc = `${base}/${page.slug}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push({
      loc,
      lastmod: page.updatedAt.toISOString().slice(0, 10),
      changefreq: "weekly",
      priority: "0.8",
      title: `${siteName} - ${page.title}`,
    });
  }

  // Admin-defined custom URL overrides (merged in, no duplicates)
  for (const override of overrides) {
    if (!override.loc) continue;
    // Normalize: if it's a path (starts with /), prepend base
    const loc = override.loc.startsWith("http")
      ? override.loc
      : `${base}${override.loc.startsWith("/") ? override.loc : `/${override.loc}`}`;
    if (seen.has(loc)) {
      // Update existing entry with override values
      const existing = urls.find((u) => u.loc === loc);
      if (existing) {
        if (override.lastmod) existing.lastmod = override.lastmod;
        if (override.changefreq) existing.changefreq = override.changefreq;
        if (override.priority) existing.priority = override.priority;
        if (override.title) existing.title = override.title;
      }
      continue;
    }
    seen.add(loc);
    urls.push({
      loc,
      lastmod: override.lastmod,
      changefreq: override.changefreq ?? "weekly",
      priority: override.priority ?? "0.8",
      title: override.title,
    });
  }

  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : "";
      const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : "";
      return `  <url>\n    <loc>${u.loc}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function buildRobotsTxt(): Promise<string> {
  const site = await getSiteConfig();
  const base = site.url.replace(/\/$/, "");
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /login\nDisallow: /signup\n\nSitemap: ${base}/sitemap.xml\n`;
}
