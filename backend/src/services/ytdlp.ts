import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "../config.js";
import { buildNetworkArgs } from "../lib/networkRoute.js";
import { getYtdlpGeoConfig } from "../lib/ytdlpConfig.js";
import { friendlyYtDlpError, withVpnFailover } from "../vpn/index.js";

/* Use a project-local tmp dir on the same drive to avoid "no space" errors on C: */
const TEMP_ROOT = resolve(import.meta.dirname ?? ".", "../../tmp");
if (!existsSync(TEMP_ROOT)) mkdirSync(TEMP_ROOT, { recursive: true });

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function extractorArgsFor(url: string): string[] {
  const args: string[] = [];
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("youtube") || host.includes("youtu.be")) {
      args.push("--extractor-args", "youtube:player_client=default,web_safari,android");
    } else if (host.includes("tiktok")) {
      args.push("--extractor-args", "tiktok:api_hostname=api.tiktokv.com");
      args.push("--impersonate", "chrome");
    } else if (host.includes("instagram")) {
      args.push("--impersonate", "Chrome-133:Macos-15");
    } else if (host.includes("twitter") || host === "x.com" || host.endsWith(".x.com")) {
      args.push("--impersonate", "chrome");
    }
  } catch {
    /* ignore */
  }
  return args;
}

/**
 * Network/resilience args shared by every yt-dlp invocation (info + download).
 */
export async function buildYtDlpArgs(countryOverride?: string, url?: string): Promise<string[]> {
  const networkArgs = await buildNetworkArgs(countryOverride, url);
  return ["--user-agent", USER_AGENT, ...extractorArgsFor(url ?? ""), ...networkArgs];
}

export interface FormatOption {
  id: string;
  label: string;
  kind: "video" | "audio" | "image";
  height?: number;
  note?: string;
  /** Exact yt-dlp -f selector resolved at analyze time (e.g. "399+251"). */
  ytdlpFormat?: string;
}

export interface MediaInfo {
  title: string;
  uploader?: string | null;
  thumbnail?: string | null;
  duration?: string | null;
  extractor?: string | null;
  webpageUrl: string;
  isImage: boolean;
  options: FormatOption[];
}

let ffmpegAvailable = false;
let ffmpegDetectPromise: Promise<boolean> | null = null;

export function hasFfmpeg(): boolean {
  return ffmpegAvailable;
}

export async function detectFfmpeg(): Promise<boolean> {
  ffmpegAvailable = await new Promise<boolean>((resolve) => {
    const proc = spawn("ffmpeg", ["-version"], { shell: true });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
  return ffmpegAvailable;
}

/** Ensure ffmpeg detection finished before building merge format strings. */
export async function ensureFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable) return true;
  if (!ffmpegDetectPromise) ffmpegDetectPromise = detectFfmpeg();
  return ffmpegDetectPromise;
}

function runYtDlpJson(url: string, countryOverride?: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const networkArgs = await buildYtDlpArgs(countryOverride, url);
    const args = [
      "-m",
      "yt_dlp",
      "-J",
      "--no-warnings",
      "--no-playlist",
      ...networkArgs,
      url,
    ];
    const proc = spawn(config.pythonBin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(cleanError(stderr) || "Failed to extract media info."));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Could not parse media info."));
      }
    });
  });
}

async function parseMediaInfo(url: string, countryOverride?: string): Promise<MediaInfo> {
  let info = await runYtDlpJson(url, countryOverride);

  if (info?._type === "playlist" && Array.isArray(info.entries)) {
    const first = info.entries.find((e: unknown) => e);
    if (first) info = first;
  }

  let thumb: string | null = info.thumbnail ?? null;
  if (!thumb && Array.isArray(info.thumbnails) && info.thumbnails.length) {
    thumb = info.thumbnails[info.thumbnails.length - 1]?.url ?? null;
  }

  const isImage = ["jpg", "jpeg", "png", "webp"].includes(info.ext);

  return {
    title: info.title ?? "Untitled",
    uploader: info.uploader ?? info.channel ?? info.uploader_id ?? null,
    thumbnail: thumb,
    duration: humanDuration(info.duration),
    extractor: info.extractor_key ?? info.extractor ?? null,
    webpageUrl: info.webpage_url ?? url,
    isImage,
    options: buildFormatOptions(info),
  };
}

export async function getInfo(url: string, countryOverride?: string): Promise<MediaInfo> {
  try {
    return await parseMediaInfo(url, countryOverride);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const { classifyYtDlpError } = await import("../vpn/errors.js");
    const { retryPolicy } = classifyYtDlpError(message);

    if (!countryOverride && retryPolicy.reason === "geo_restricted") {
      const cfg = await getYtdlpGeoConfig();
      const target = cfg.defaultCountry || "BD";
      return withVpnFailover(target, async () => parseMediaInfo(url, target));
    }
    throw err;
  }
}

function heightLabel(height: number): string {
  if (height >= 4320) return `8K (${height}p)`;
  if (height >= 2160) return `4K (${height}p)`;
  if (height >= 1440) return `2K (${height}p)`;
  return `${height}p`;
}

function formatQualityScore(f: {
  filesize?: number;
  filesize_approx?: number;
  fps?: number;
  tbr?: number;
  vcodec?: string;
}): number {
  const bytes = f.filesize ?? f.filesize_approx ?? 0;
  const codecBoost =
    f.vcodec?.includes("av01") || f.vcodec?.includes("vp9") || f.vcodec?.includes("avc1") ? 50_000 : 0;
  return bytes + (f.fps ?? 0) * 10_000 + (f.tbr ?? 0) * 100 + codecBoost;
}

function isUsableVideoFormat(f: { vcodec?: string; height?: number; format_note?: string }): boolean {
  if (!f.vcodec || f.vcodec === "none" || !f.height) return false;
  const note = (f.format_note ?? "").toLowerCase();
  if (note.includes("storyboard") || note.includes("thumbnail")) return false;
  return true;
}

function pickBestAudioFormat(formats: any[]): any | null {
  const audio = formats.filter((f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none");
  if (!audio.length) return null;
  return audio.sort((a, b) => formatQualityScore(b) - formatQualityScore(a))[0];
}

function pickBestVideoAtHeight(formats: any[], height: number): any | null {
  const videos = formats.filter((f) => isUsableVideoFormat(f) && f.height === height);
  if (!videos.length) return null;
  return videos.sort((a, b) => formatQualityScore(b) - formatQualityScore(a))[0];
}

function pickBestProgressiveAtHeight(formats: any[], height: number): any | null {
  const progressive = formats.filter(
    (f) =>
      f.vcodec &&
      f.vcodec !== "none" &&
      f.acodec &&
      f.acodec !== "none" &&
      f.height === height &&
      f.ext === "mp4"
  );
  if (!progressive.length) return null;
  return progressive.sort((a, b) => formatQualityScore(b) - formatQualityScore(a))[0];
}

/** Build an exact yt-dlp format string for a target height (video+audio merge or progressive). */
function ytdlpFormatForHeight(formats: any[], height: number): string {
  const progressive = pickBestProgressiveAtHeight(formats, height);
  if (progressive?.format_id != null) return String(progressive.format_id);

  const video = pickBestVideoAtHeight(formats, height);
  const audio = pickBestAudioFormat(formats);
  if (video?.format_id != null && audio?.format_id != null) {
    return `${video.format_id}+${audio.format_id}`;
  }

  return ffmpegAvailable
    ? `bestvideo[height=${height}]+bestaudio/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
    : `best[height=${height}][ext=mp4][vcodec!=none][acodec!=none]/best[height<=${height}][ext=mp4][vcodec!=none][acodec!=none]/best`;
}

function buildFormatOptions(info: any): FormatOption[] {
  const formats: any[] = Array.isArray(info.formats) ? info.formats : [];
  const bestAudio = pickBestAudioFormat(formats);
  const bestAudioBytes = bestAudio?.filesize ?? bestAudio?.filesize_approx ?? 0;
  const videoHeights = new Map<number, { filesize?: number; progressive: boolean; ytdlpFormat: string }>();
  let hasAudioOnly = false;
  let hasImage = false;
  let bestVideoBytes = 0;

  for (const f of formats) {
    const vcodec = f.vcodec;
    const acodec = f.acodec;
    const height = f.height;
    const bytes = f.filesize ?? f.filesize_approx ?? 0;
    if (["jpg", "jpeg", "png", "webp"].includes(f.ext) && !height) {
      hasImage = true;
      continue;
    }
    if (vcodec && vcodec !== "none" && height) {
      const progressive = Boolean(acodec && acodec !== "none");
      const filesize = bytes || undefined;
      const ytdlpFormat = ytdlpFormatForHeight(formats, height);
      const existing = videoHeights.get(height);
      if (!existing || (progressive && !existing.progressive) || (filesize && !existing.filesize)) {
        videoHeights.set(height, { filesize, progressive, ytdlpFormat });
      }
      if (bytes > bestVideoBytes) bestVideoBytes = bytes;
    }
    if ((!vcodec || vcodec === "none") && acodec && acodec !== "none") {
      hasAudioOnly = true;
    }
  }

  const estimateSize = (videoBytes?: number, progressive?: boolean): string | null => {
    if (!videoBytes) return null;
    const total = progressive || !bestAudioBytes ? videoBytes : videoBytes + bestAudioBytes;
    return humanSize(total);
  };

  const options: FormatOption[] = [];
  const maxHeight = videoHeights.size ? Math.max(...videoHeights.keys()) : 0;
  const bestSize = estimateSize(
    videoHeights.get(maxHeight)?.filesize ?? bestVideoBytes,
    videoHeights.get(maxHeight)?.progressive
  );
  options.push({
    id: "best",
    label: "Best quality (auto)",
    kind: "video",
    ytdlpFormat: ffmpegAvailable ? "bestvideo*+bestaudio/best" : "best[ext=mp4][vcodec!=none]/best",
    note: bestSize ? `~${bestSize} · MP4` : "Highest video + audio",
  });

  for (const height of [...videoHeights.keys()].sort((a, b) => b - a)) {
    const meta = videoHeights.get(height)!;
    const size = estimateSize(meta.filesize, meta.progressive);
    options.push({
      id: `h${height}`,
      label: heightLabel(height),
      kind: "video",
      height,
      ytdlpFormat: meta.ytdlpFormat,
      note: size ? `~${size} · MP4` : "Video + audio",
    });
  }

  if (hasAudioOnly || formats.length) {
    const audioSize = humanSize(bestAudioBytes);
    options.push({
      id: "audio",
      label: `Audio only${ffmpegAvailable ? " (MP3)" : ""}`,
      kind: "audio",
      ytdlpFormat: bestAudio?.format_id != null ? String(bestAudio.format_id) : "bestaudio/best",
      note: audioSize ? `~${audioSize}` : "Sound track",
    });
  }

  if (hasImage || ["jpg", "jpeg", "png", "webp"].includes(info.ext)) {
    options.push({ id: "image", label: "Image / Photo", kind: "image", note: "Original picture" });
  }

  return options;
}

export function formatSelectorFor(choice: string, formatOverride?: string): string {
  const explicit = formatOverride?.trim();
  if (explicit) return explicit;

  if (choice === "best") {
    return ffmpegAvailable ? "bestvideo*+bestaudio/best" : "best[ext=mp4][vcodec!=none]/best";
  }
  if (choice === "audio") return "bestaudio/best";
  if (choice === "image") return "best";
  const m = /^h(\d+)$/.exec(choice);
  if (m) {
    const h = Number(m[1]);
    return ffmpegAvailable
      ? `bestvideo[height=${h}]+bestaudio/bestvideo[height<=${h}]+bestaudio/best[height<=${h}][ext=mp4]/best[height<=${h}]/best`
      : `best[height=${h}][ext=mp4][vcodec!=none][acodec!=none]/best[height<=${h}][ext=mp4][vcodec!=none][acodec!=none]/best`;
  }
  return "best";
}

export interface DownloadResult {
  filePath: string;
  downloadName: string;
  cleanup: () => void;
}

export function downloadMedia(url: string, choice: string): Promise<DownloadResult> {
  return new Promise(async (resolve, reject) => {
    const jobDir = mkdtempSync(join(TEMP_ROOT, "downloadhub-"));
    const networkArgs = await buildYtDlpArgs(undefined, url);

    const args = [
      "-m",
      "yt_dlp",
      "--no-warnings",
      "--no-playlist",
      ...networkArgs,
      "-f",
      formatSelectorFor(choice),
      "-o",
      join(jobDir, "%(title).100s.%(ext)s"),
    ];

    if (choice === "audio" && ffmpegAvailable) {
      args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "192K");
    }
    if ((choice.startsWith("h") || choice === "best") && ffmpegAvailable) {
      args.push("--merge-output-format", "mp4");
    }
    args.push(url);

    const proc = spawn(config.pythonBin, args, { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      rmSync(jobDir, { recursive: true, force: true });
      reject(err);
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        rmSync(jobDir, { recursive: true, force: true });
        reject(new Error(cleanError(stderr) || "Download failed."));
        return;
      }
      const files = readdirSync(jobDir)
        .map((name) => join(jobDir, name))
        .filter((p) => {
          try {
            return statSync(p).isFile();
          } catch {
            return false;
          }
        })
        .sort((a, b) => statSync(b).size - statSync(a).size);

      if (!files.length) {
        rmSync(jobDir, { recursive: true, force: true });
        reject(new Error("Download produced no file."));
        return;
      }

      const filePath = files[0];
      const baseName = filePath.split(/[\\/]/).pop() ?? `download-${randomUUID()}`;
      resolve({
        filePath,
        downloadName: safeName(baseName),
        cleanup: () => rmSync(jobDir, { recursive: true, force: true }),
      });
    });
  });
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 150) || "download";
}

function humanSize(num?: number | null): string | null {
  if (!num) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = num;
  for (const unit of units) {
    if (size < 1024 || unit === units[units.length - 1]) return `${size.toFixed(1)} ${unit}`;
    size /= 1024;
  }
  return null;
}

function humanDuration(seconds?: number | null): string | null {
  if (!seconds) return null;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function cleanError(msg: string): string {
  return friendlyYtDlpError(msg);
}

export function getYtdlpVersion(): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn(config.pythonBin, ["-m", "yt_dlp", "--version"], { windowsHide: true });
    let stdout = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.on("error", () => resolve("unknown"));
    proc.on("close", (code) => {
      resolve(code === 0 ? stdout.trim() : "unknown");
    });
  });
}

export function getFfmpegVersion(): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"], { shell: true });
    let stdout = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.on("error", () => resolve("unknown"));
    proc.on("close", (code) => {
      if (code !== 0) return resolve("unknown");
      const match = stdout.match(/version\s+([^\s,]+)/);
      resolve(match ? match[1] : "unknown");
    });
  });
}

