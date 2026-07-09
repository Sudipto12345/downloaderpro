import { join } from "node:path";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { downloadRouter } from "./routes/download.js";
import { authRouter } from "./routes/auth.js";
import { downloadsRouter } from "./routes/downloads.js";
import { favoritesRouter } from "./routes/favorites.js";
import { adminRouter } from "./routes/admin.js";
import { publicRouter } from "./routes/public.js";
import { detectFfmpeg, hasFfmpeg } from "./services/ytdlp.js";
import { setFfmpegFlag } from "./services/jobs.js";
import { buildRobotsTxt, buildSitemapXml } from "./lib/sitemap.js";
import { getGscConfig } from "./lib/settings.js";

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
    credentials: true,
  })
);

app.use("/uploads", express.static(join(process.cwd(), "uploads")));

app.get("/sitemap.xml", async (_req, res) => {
  res.type("application/xml").send(await buildSitemapXml());
});

app.get("/robots.txt", async (_req, res) => {
  res.type("text/plain").send(await buildRobotsTxt());
});

app.get(/^\/google[a-z0-9]+\.html$/i, async (req, res) => {
  const gsc = await getGscConfig();
  const content = (gsc.verificationContent ?? "").trim();
  if (!content) return res.status(404).type("text/plain").send("Not found");
  const expected = `google${content}.html`.toLowerCase();
  if (req.path.toLowerCase() !== `/${expected}`) {
    return res.status(404).type("text/plain").send("Not found");
  }
  res.type("text/html").send(`google-site-verification: google${content}.html`);
});

app.get("/api/health", async (_req, res) => {
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }
  res.json({
    status: database ? "ok" : "degraded",
    ffmpeg: hasFfmpeg(),
    database,
  });
});

// Public config (no auth)
app.use("/api/public", publicRouter);

// Auth & data APIs
app.use("/api/auth", authRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/admin", adminRouter);

// yt-dlp analyze/download (must stay last so its /download/* paths don't shadow others)
app.use("/api", downloadRouter);

const port = config.port;
detectFfmpeg().then((ff) => {
  setFfmpegFlag(ff);
  app.listen(port, () => {
    console.log(`DownloadHub backend on http://localhost:${port}  (ffmpeg: ${ff})`);
  });
});
