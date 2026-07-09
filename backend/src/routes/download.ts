import { Router } from "express";
import { getInfo } from "../services/ytdlp.js";
import { getJob } from "../services/jobs.js";
import {
  contentTypeFor,
  needsTempFile,
  parseStreamError,
  safeDownloadName,
  spawnStreamDownload,
  streamViaTempFile,
} from "../services/streamDownload.js";
import { recordGlobalDownload } from "../lib/stats.js";

export const downloadRouter = Router();

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Strip YouTube playlist/radio params so yt-dlp treats the URL as a single video. */
function stripPlaylistParams(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const dominated = ["list", "start_radio", "index", "pp"];
    dominated.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function sanitizeYtdlpFormat(raw: string): string | undefined {
  const value = raw.trim();
  if (!value || value.length > 160) return undefined;
  if (!/^[\w+./\[\]<=>,:*-]+$/.test(value)) return undefined;
  return value;
}

/**
 * Route handler that selects between temp-file streaming (for merged 2K/4K/best)
 * and direct stdout streaming (for audio-only and single streams).
 *
 * The distinction matters because:
 * - Merged MP4 (video+audio via ffmpeg) needs a seekable output → must use a tmp file
 * - Audio-only / single-stream → can pipe stdout directly for lower latency
 * - Using temp file for merged formats also provides Content-Length, fixing iOS Safari
 */
async function pipeStreamToResponse(
  req: import("express").Request,
  res: import("express").Response,
  url: string,
  choice: string,
  title: string,
  isImage?: boolean,
  ytdlpFormat?: string
): Promise<void> {
  const filename = safeDownloadName(title, choice, isImage);

  // High-res / merged formats MUST go through a temp file for correct MP4 output
  if (needsTempFile(choice, ytdlpFormat)) {
    try {
      await streamViaTempFile(req, res, url, choice, filename, isImage, ytdlpFormat);
      // Record download after successful temp-file stream starts
      void recordGlobalDownload().catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed.";
      if (!res.headersSent) {
        res.status(400).json({ error: message });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
    return;
  }

  // Single-stream path (audio, image, or no-ffmpeg fallback): pipe stdout
  let proc;
  try {
    proc = await spawnStreamDownload(url, choice, ytdlpFormat);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start download.";
    return res.status(400).json({ error: message }) as unknown as void;
  }

  let stderr = "";
  let started = false;
  let recorded = false;

  const beginStream = (firstChunk?: Buffer) => {
    if (started) return;
    started = true;
    res.setHeader("Content-Type", contentTypeFor(choice, isImage));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Accept-Ranges", "bytes");

    if (firstChunk?.length) {
      res.write(firstChunk);
      if (!recorded) {
        recorded = true;
        void recordGlobalDownload().catch(() => {});
      }
    }

    proc.stdout?.pipe(res, { end: true });
  };

  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  proc.stdout?.once("data", (chunk: Buffer) => {
    beginStream(chunk);
  });

  proc.on("error", () => {
    if (!started) {
      res.status(500).json({ error: "Stream failed to start." });
      return;
    }
    if (!res.writableEnded) res.end();
  });

  proc.on("close", (code) => {
    if (!started) {
      return res.status(400).json({ error: parseStreamError(stderr) });
    }
    if (code !== 0 && !res.writableEnded) {
      res.end();
    }
  });

  req.on("close", () => {
    proc.kill("SIGTERM");
  });
}

/* ------------------------------------------------------------------ */
/*  Analyze                                                           */
/* ------------------------------------------------------------------ */
downloadRouter.post("/analyze", async (req, res) => {
  const rawUrl = String(req.body?.url ?? "").trim();
  if (!rawUrl || !isValidUrl(rawUrl)) {
    return res.status(400).json({ error: "Please provide a valid http(s) URL." });
  }
  const url = stripPlaylistParams(rawUrl);
  try {
    const info = await getInfo(url);
    return res.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze URL.";
    return res.status(400).json({ error: message });
  }
});

/* ------------------------------------------------------------------ */
/*  Stream download — smart routing: temp file for merged, stdout for simple */
/* ------------------------------------------------------------------ */
downloadRouter.get("/download/stream", (req, res) => {
  const rawUrl = String(req.query.url ?? "").trim();
  const choice = String(req.query.choice ?? "best").trim();
  const title = String(req.query.title ?? "download").trim();
  const ytdlpFormat = sanitizeYtdlpFormat(String(req.query.format ?? ""));

  if (!rawUrl || !isValidUrl(rawUrl)) {
    return res.status(400).json({ error: "Missing or invalid url." });
  }

  const url = stripPlaylistParams(rawUrl);
  void pipeStreamToResponse(req, res, url, choice, title, false, ytdlpFormat);
});

/* ------------------------------------------------------------------ */
/*  Legacy job API — points clients to stream (no server-side files)    */
/* ------------------------------------------------------------------ */
downloadRouter.post("/download/start", (req, res) => {
  const rawUrl = String(req.body?.url ?? "").trim();
  const choice = String(req.body?.choice ?? "best").trim();
  if (!rawUrl || !isValidUrl(rawUrl)) {
    return res.status(400).json({ error: "Missing or invalid url." });
  }
  const url = stripPlaylistParams(rawUrl);
  const title = String(req.body?.title ?? "download").trim();
  const params = new URLSearchParams({ url, choice, title });
  return res.json({
    streamUrl: `/api/download/stream?${params.toString()}`,
    message: "Use streamUrl for direct browser download; nothing is stored on the server.",
  });
});

downloadRouter.get("/download/progress/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found. Use GET /api/download/stream instead." });
  }
  res.status(410).json({ error: "Job-based downloads are deprecated. Use /api/download/stream." });
});

downloadRouter.get("/download/file/:jobId", (_req, res) => {
  return res.status(410).json({
    error: "Server file storage is disabled. Use GET /api/download/stream for direct downloads.",
  });
});

/* ------------------------------------------------------------------ */
/*  Legacy GET /download — same smart-stream                           */
/* ------------------------------------------------------------------ */
downloadRouter.get("/download", (req, res) => {
  const rawUrl = String(req.query.url ?? "").trim();
  const choice = String(req.query.choice ?? "best").trim();
  const title = String(req.query.title ?? "download").trim();
  const ytdlpFormat = sanitizeYtdlpFormat(String(req.query.format ?? ""));

  if (!rawUrl || !isValidUrl(rawUrl)) {
    return res.status(400).json({ error: "Missing or invalid url." });
  }

  const url = stripPlaylistParams(rawUrl);
  void pipeStreamToResponse(req, res, url, choice, title, false, ytdlpFormat);
});
