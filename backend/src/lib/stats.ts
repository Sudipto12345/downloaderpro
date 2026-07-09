import { prisma } from "../db.js";
import { getSetting, setSetting } from "./settings.js";

export interface DailyMetrics {
  date: string;
  downloads: number;
  pageViews: number;
  adClicks: number;
  adImpressions: number;
}

export interface AdPlacementStats {
  clicks: number;
  impressions: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function bumpDaily(field: "count" | "pageViews" | "adClicks" | "adImpressions"): Promise<void> {
  const key = todayKey();
  await prisma.dailyStat.upsert({
    where: { date: key },
    create: { date: key, [field]: 1 },
    update: { [field]: { increment: 1 } },
  });
}

async function bumpTotal(key: string): Promise<void> {
  const current = await getSetting<number>(key, 0);
  const next = (typeof current === "number" ? current : 0) + 1;
  await setSetting(key, next);
}

/** Increment global download counter + today's daily stat. */
export async function recordGlobalDownload(): Promise<void> {
  await bumpTotal("totalDownloads");
  await bumpDaily("count");
}

export async function recordPageView(): Promise<void> {
  await bumpTotal("totalPageViews");
  await bumpDaily("pageViews");
}

export async function recordAdImpression(placement: string): Promise<void> {
  await bumpTotal("totalAdImpressions");
  await bumpDaily("adImpressions");
  await bumpAdPlacement(placement, "impressions");
}

export async function recordAdClick(placement: string): Promise<void> {
  await bumpTotal("totalAdClicks");
  await bumpDaily("adClicks");
  await bumpAdPlacement(placement, "clicks");
}

async function bumpAdPlacement(placement: string, field: "clicks" | "impressions"): Promise<void> {
  const current = await getSetting<Record<string, AdPlacementStats>>("adPlacementStats", {});
  const row = current[placement] ?? { clicks: 0, impressions: 0 };
  row[field] += 1;
  await setSetting("adPlacementStats", { ...current, [placement]: row });
}

export async function getTrafficTotals(): Promise<{
  totalPageViews: number;
  totalAdClicks: number;
  totalAdImpressions: number;
}> {
  const [totalPageViews, totalAdClicks, totalAdImpressions] = await Promise.all([
    getSetting<number>("totalPageViews", 0),
    getSetting<number>("totalAdClicks", 0),
    getSetting<number>("totalAdImpressions", 0),
  ]);
  return {
    totalPageViews: typeof totalPageViews === "number" ? totalPageViews : 0,
    totalAdClicks: typeof totalAdClicks === "number" ? totalAdClicks : 0,
    totalAdImpressions: typeof totalAdImpressions === "number" ? totalAdImpressions : 0,
  };
}

export async function getAdPlacementStats(): Promise<Record<string, AdPlacementStats>> {
  return getSetting<Record<string, AdPlacementStats>>("adPlacementStats", {});
}

export async function getDailyStats(days = 7): Promise<DailyMetrics[]> {
  const result: DailyMetrics[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = await prisma.dailyStat.findUnique({ where: { date: key } });
    result.push({
      date: key,
      downloads: row?.count ?? 0,
      pageViews: row?.pageViews ?? 0,
      adClicks: row?.adClicks ?? 0,
      adImpressions: row?.adImpressions ?? 0,
    });
  }
  return result;
}

/** @deprecated use getDailyStats — kept for callers expecting { date, count } */
export async function getDailyDownloadCounts(days = 7): Promise<{ date: string; count: number }[]> {
  const rows = await getDailyStats(days);
  return rows.map((r) => ({ date: r.date, count: r.downloads }));
}

export async function resetStats(keepDays = 7): Promise<void> {
  await setSetting("totalDownloads", 0);
  await setSetting("totalPageViews", 0);
  await setSetting("totalAdClicks", 0);
  await setSetting("totalAdImpressions", 0);
  await setSetting("adPlacementStats", {});
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  await prisma.dailyStat.deleteMany({ where: { date: { lt: cutoffKey } } });
}
