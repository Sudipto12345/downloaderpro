import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getPlanLimit, startOfToday } from "../lib/plans.js";

export const downloadsRouter = Router();

function serialize(d: {
  id: string;
  userId: string;
  title: string;
  platform: string;
  url: string;
  quality: string;
  thumbnail: string | null;
  createdAt: Date;
}) {
  return {
    id: d.id,
    userId: d.userId,
    title: d.title,
    platform: d.platform,
    url: d.url,
    quality: d.quality,
    thumbnail: d.thumbnail ?? undefined,
    date: d.createdAt.toISOString(),
  };
}

/* List own download history (newest first) */
downloadsRouter.get("/", requireAuth, async (req, res) => {
  const downloads = await prisma.download.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  return res.json(downloads.map(serialize));
});

/* Today's download count for the current user */
downloadsRouter.get("/today-count", requireAuth, async (req, res) => {
  const count = await prisma.download.count({
    where: { userId: req.user!.id, createdAt: { gte: startOfToday() } },
  });
  return res.json({ count });
});

const recordSchema = z.object({
  title: z.string().trim().min(1).max(500),
  platform: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2000),
  quality: z.string().trim().min(1).max(120),
  thumbnail: z.string().trim().url().max(2000).optional().or(z.literal("")),
});

/* Record a completed download (enforces per-plan daily quota) */
downloadsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid download payload." });
  }
  const user = req.user!;
  const limit = getPlanLimit(user.planId);

  if (limit.maxDownloadsPerDay !== -1) {
    const todayCount = await prisma.download.count({
      where: { userId: user.id, createdAt: { gte: startOfToday() } },
    });
    if (todayCount >= limit.maxDownloadsPerDay) {
      return res.status(429).json({
        error: `Daily download limit reached (${limit.maxDownloadsPerDay}/day). Upgrade your plan for more.`,
      });
    }
  }

  const { title, platform, url, quality, thumbnail } = parsed.data;
  const created = await prisma.download.create({
    data: {
      userId: user.id,
      title,
      platform,
      url,
      quality,
      thumbnail: thumbnail ? thumbnail : null,
    },
  });
  return res.status(201).json(serialize(created));
});
