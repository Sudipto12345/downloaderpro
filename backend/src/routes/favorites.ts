import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const favoritesRouter = Router();

function serialize(f: {
  id: string;
  userId: string;
  title: string;
  platform: string;
  url: string;
  thumbnail: string | null;
  createdAt: Date;
}) {
  return {
    id: f.id,
    userId: f.userId,
    title: f.title,
    platform: f.platform,
    url: f.url,
    thumbnail: f.thumbnail ?? undefined,
    addedAt: f.createdAt.toISOString(),
  };
}

/* List own favorites (newest first) */
favoritesRouter.get("/", requireAuth, async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  return res.json(favorites.map(serialize));
});

const toggleSchema = z.object({
  title: z.string().trim().min(1).max(500),
  platform: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2000),
  thumbnail: z.string().trim().url().max(2000).optional().or(z.literal("")),
});

/* Toggle a favorite by url. Returns { favorited: boolean }. */
favoritesRouter.post("/", requireAuth, async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid favorite payload." });
  }
  const userId = req.user!.id;
  const { title, platform, url, thumbnail } = parsed.data;

  const existing = await prisma.favorite.findUnique({
    where: { userId_url: { userId, url } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return res.json({ favorited: false });
  }

  await prisma.favorite.create({
    data: { userId, title, platform, url, thumbnail: thumbnail ? thumbnail : null },
  });
  return res.json({ favorited: true });
});

/* Remove a favorite by id (only own) */
favoritesRouter.delete("/:id", requireAuth, async (req, res) => {
  const result = await prisma.favorite.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (result.count === 0) {
    return res.status(404).json({ error: "Favorite not found." });
  }
  return res.json({ ok: true });
});
