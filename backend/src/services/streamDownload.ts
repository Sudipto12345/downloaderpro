import { spawn, type ChildProcess } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type { Request, Response } from "express";
import { config } from "../config.js";
import { buildYtDlpArgs, ensureFfmpeg, formatSelectorFor, hasFfmpeg } from "./ytdlp.js";
import { friendlyYtDlpError } from "../vpn/index.js";

/* Reuse the same tmp root as ytdlp.ts */
const TEMP_ROOT = resolve(import.meta.dirname ?? ".", "../../tmp");

export function streamFormatFor(choice: string, formatOverride?: string): string {
  return formatSelectorFor(choice, formatOverride);
}

export function extensionFor(choice: string, isImage?: boolean): string {
  if (choice === "audio") return "mp3";
  if (isImage || choice === "image") return "jpg";
  return "mp4";
}

export function contentTypeFor(choice: string, isImage?: boolean): string {
  if (choice === "audio") return "audio/mpeg";
  if (isImage || choice === "image") return "image/jpeg";
  return "video/mp4";
}

export function safeDownloadName(title: string, choice: string, isImage?: boolean): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 100) || "download";
  const m = /^h(\d+)$/.exec(choice);
  if (m) return `${base}_${m[1]}p.${extensionFor(choice, isImage)}`;
  if (choice === "audio") return `${base}_audio.${extensionFor(choice, isImage)}`;
  if (choice === "best") return `${base}_best.${extensionFor(choice, isImage)}`;
  return `${base}.${extensionFor(choice, isImage)}`;
}

/**
 * Returns true when the download choice requires ffmpeg to merge video+audio streams.
 * In these cases the MP4 muxer needs seekable output — piping to stdout would break
 * the moov atom (causing black screen / audio-only playback and mobile file errors).
 * We must write to a temp file first, then stream it.
 */
function requiresTempFile(choice: string, format: string): boolean {
  if (!hasFfmpeg()) return false;
  if (choice === "image") return false;
  // Any format that mixes video+audio streams via "+" needs a mux pass
  return choice === "best" || choice.startsWith("h") || format.includes("+");
}

/**
 * Download via a temporary file, then stream to the HTTP response.
 * This is the only safe path for merged MP4 (2K, 4K, etc.) because the moov
 * atom must be written before any data is flushed to the client.
 * Also provides Content-Length so iOS Safari shows proper progress.
 */
export async function streamViaTempFile(
  req: Request,
  res: Response,
  url: string,
  choice: string,
  filename: string,
  isImage?: boolean,
  formatOverride?: string
): Promise<void> {
  await ensureFfmpeg();
  const format = streamFormatFor(choice, formatOverride);
  const networkArgs = await buildYtDlpArgs(undefined, url);
  const jobDir = mkdtempSync(join(TEMP_ROOT, "stream-"));

  const args = [
    "-m",
    "yt_dlp",
    "--no-warnings",
    "--no-playlist",
    "--no-part",
    "--no-cache-dir",
    "--no-mtime",
    ...networkArgs,
    "-f",
    format,
    "-o",
    join(jobDir, "%(title).100s.%(ext)s"),
  ];

  if (choice === "audio" && hasFfmpeg()) {
    args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "192K");
  } else if (hasFfmpeg()) {
    args.push("--merge-output-format", "mp4");
    args.push("--postprocessor-args", "ffmpeg:-movflags +faststart");
  }

  args.push(url);

  let stderr = "";

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(config.pythonBin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    proc.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(friendlyYtDlpError(stderr) || "Download failed."));
      else resolve();
    });

    // Abort yt-dlp if client disconnects
    req.on("close", () => proc.kill("SIGTERM"));
  }).catch((err) => {
    rmSync(jobDir, { recursive: true, force: true });
    throw err;
  });

  // Find the downloaded file (pick largest)
  const files = readdirSync(jobDir)
    .map((name) => join(jobDir, name))
    .filter((p) => {
      try { return statSync(p).isFile(); } catch { return false; }
    })
    .sort((a, b) => statSync(b).size - statSync(a).size);

  if (!files.length) {
    rmSync(jobDir, { recursive: true, force: true });
    throw new Error("Download produced no file.");
  }

  const filePath = files[0];
  const fileSize = statSync(filePath).size;

  res.setHeader("Content-Type", contentTypeFor(choice, isImage));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader("Content-Length", String(fileSize));
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  const readStream = createReadStream(filePath);
  readStream.pipe(res);
  readStream.on("end", () => rmSync(jobDir, { recursive: true, force: true }));
  readStream.on("error", () => {
    rmSync(jobDir, { recursive: true, force: true });
    if (!res.writableEnded) res.end();
  });
}

/**
 * Spawn yt-dlp writing media to stdout — used ONLY for single-stream formats
 * (audio-only, images, or when ffmpeg is unavailable).
 * For merged video+audio, use streamViaTempFile() instead.
 */
export async function spawnStreamDownload(
  url: string,
  choice: string,
  formatOverride?: string
): Promise<ChildProcess> {
  await ensureFfmpeg();
  const format = streamFormatFor(choice, formatOverride);
  const networkArgs = await buildYtDlpArgs(undefined, url);
  const args = [
    "-m",
    "yt_dlp",
    "--no-warnings",
    "--no-playlist",
    "--no-part",
    "--no-cache-dir",
    "--no-mtime",
    ...networkArgs,
    "-f",
    format,
    "-o",
    "-",
  ];

  // Audio extraction to mp3 works fine via stdout
  if (choice === "audio" && hasFfmpeg()) {
    args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "192K");
  }

  args.push(url);

  return spawn(config.pythonBin, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

export function needsTempFile(choice: string, formatOverride?: string): boolean {
  const format = streamFormatFor(choice, formatOverride);
  return requiresTempFile(choice, format);
}

export function parseStreamError(stderr: string): string {
  return friendlyYtDlpError(stderr) || "Download failed.";
}

export { existsSync };
