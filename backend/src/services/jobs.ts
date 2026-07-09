import { EventEmitter } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "../config.js";
import { buildYtDlpArgs } from "./ytdlp.js";
import { friendlyYtDlpError } from "../vpn/index.js";

/* ------------------------------------------------------------------ */
/*  Temp root on same drive to avoid C: "no space" issues             */
/* ------------------------------------------------------------------ */
const TEMP_ROOT = resolve(import.meta.dirname ?? ".", "../../tmp");
if (!existsSync(TEMP_ROOT)) mkdirSync(TEMP_ROOT, { recursive: true });

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface ProgressEvent {
  /** 0-100, or undefined while extracting metadata */
  percent?: number;
  /** Human-readable download speed, e.g. "5.23MiB/s" */
  speed?: string;
  /** Human-readable ETA, e.g. "00:42" */
  eta?: string;
  /** Total size string, e.g. "120.53MiB" */
  totalSize?: string;
  /** Current phase description */
  phase: string;
}

export type JobStatus = "pending" | "downloading" | "merging" | "done" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  progress: ProgressEvent;
  filePath?: string;
  downloadName?: string;
  error?: string;
  emitter: EventEmitter;
  cleanup: () => void;
}

/* ------------------------------------------------------------------ */
/*  In-memory job store                                               */
/* ------------------------------------------------------------------ */
const jobs = new Map<string, Job>();

/** Auto-cleanup finished jobs after 10 min */
const JOB_TTL_MS = 10 * 60 * 1000;

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/* ------------------------------------------------------------------ */
/*  ffmpeg detection (imported from ytdlp service)                    */
/* ------------------------------------------------------------------ */
let ffmpegAvailable = false;

export function setFfmpegFlag(val: boolean) {
  ffmpegAvailable = val;
}

export function hasFfmpegFlag(): boolean {
  return ffmpegAvailable;
}

/* ------------------------------------------------------------------ */
/*  Format selector (same logic as ytdlp.ts)                         */
/* ------------------------------------------------------------------ */
function formatSelectorFor(choice: string): string {
  if (choice === "best") {
    return ffmpegAvailable ? "bestvideo*+bestaudio/best" : "best[ext=mp4]/best";
  }
  if (choice === "audio") return "bestaudio/best";
  if (choice === "image") return "best";
  const m = /^h(\d+)$/.exec(choice);
  if (m) {
    const h = Number(m[1]);
    return ffmpegAvailable
      ? `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`
      : `best[height<=${h}][ext=mp4]/best[height<=${h}]/best`;
  }
  return "best";
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 150) || "download";
}

/* ------------------------------------------------------------------ */
/*  Parse yt-dlp progress lines                                      */
/* ------------------------------------------------------------------ */
/*
  yt-dlp outputs lines like:
    [download]  45.2% of  120.53MiB at  5.23MiB/s ETA 00:12
    [download]  100% of  120.53MiB in 00:23
    [Merger] Merging formats into ...
    [ExtractAudio] ...
*/
function parseProgressLine(line: string): Partial<ProgressEvent> | null {
  // Download percentage line
  const dlMatch = line.match(
    /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\S+)\s+at\s+([\d.]+\S+\/s)\s+ETA\s+(\S+)/
  );
  if (dlMatch) {
    return {
      percent: parseFloat(dlMatch[1]),
      totalSize: dlMatch[2],
      speed: dlMatch[3],
      eta: dlMatch[4],
      phase: "Downloading",
    };
  }

  // 100% complete line
  const doneMatch = line.match(/\[download\]\s+100%\s+of\s+~?([\d.]+\S+)/);
  if (doneMatch) {
    return {
      percent: 100,
      totalSize: doneMatch[1],
      speed: undefined,
      eta: "00:00",
      phase: "Download complete",
    };
  }

  // Already downloaded
  if (line.includes("has already been downloaded")) {
    return { percent: 100, phase: "Already downloaded" };
  }

  // Merging
  if (line.includes("[Merger]") || line.includes("Merging formats")) {
    return { percent: 100, phase: "Merging audio & video…", speed: undefined, eta: undefined };
  }

  // Audio extraction
  if (line.includes("[ExtractAudio]")) {
    return { percent: 100, phase: "Extracting audio…", speed: undefined, eta: undefined };
  }

  // Destination line (new fragment starting)
  if (line.includes("[download] Destination:")) {
    return { percent: 0, phase: "Downloading" };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Start a download job                                              */
/* ------------------------------------------------------------------ */
export function startDownloadJob(url: string, choice: string): Job {
  const id = randomUUID();
  const jobDir = mkdtempSync(join(TEMP_ROOT, "downloadhub-"));
  const emitter = new EventEmitter();

  const job: Job = {
    id,
    status: "pending",
    progress: { phase: "Starting…" },
    emitter,
    cleanup: () => {
      try { rmSync(jobDir, { recursive: true, force: true }); } catch { /* ignore */ }
    },
  };

  jobs.set(id, job);

  void (async () => {
    let networkArgs: string[];
    try {
      networkArgs = await buildYtDlpArgs(undefined, url);
    } catch {
      job.status = "error";
      job.error = "Failed to load download configuration.";
      emitter.emit("progress", job.progress);
      emitter.emit("done", job);
      scheduleCleanup(id, jobDir);
      return;
    }

    const args = [
      "-m", "yt_dlp",
      "--no-warnings",
      "--no-playlist",
      "--newline",
      ...networkArgs,
      "-f", formatSelectorFor(choice),
      "-o", join(jobDir, "%(title).100s.%(ext)s"),
    ];

    if (choice === "audio" && ffmpegAvailable) {
      args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "192K");
    }
    if ((choice.startsWith("h") || choice === "best") && ffmpegAvailable) {
      args.push("--merge-output-format", "mp4");
    }
    args.push(url);

    let proc: ChildProcess;
    try {
      proc = spawn(config.pythonBin, args, { windowsHide: true });
    } catch {
      job.status = "error";
      job.error = "Failed to start download process.";
      emitter.emit("progress", job.progress);
      emitter.emit("done", job);
      scheduleCleanup(id, jobDir);
      return;
    }

    job.status = "downloading";
    let stderrBuf = "";

    const handleData = (chunk: Buffer) => {
      const text = chunk.toString();
      stderrBuf += text;
      const lines = text.split(/[\r\n]+/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = parseProgressLine(line);
        if (parsed) {
          Object.assign(job.progress, parsed);
          if (parsed.phase?.includes("Merging") || parsed.phase?.includes("Extracting")) {
            job.status = "merging";
          }
          emitter.emit("progress", { ...job.progress });
        }
      }
    };

    proc.stderr?.on("data", handleData);
    proc.stdout?.on("data", handleData);

    proc.on("error", (err) => {
      job.status = "error";
      job.error = err.message;
      emitter.emit("progress", { ...job.progress, phase: "Error" });
      emitter.emit("done", job);
      scheduleCleanup(id, jobDir);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        job.status = "error";
        job.error = cleanError(stderrBuf) || "Download failed.";
        emitter.emit("progress", { ...job.progress, phase: "Error" });
        emitter.emit("done", job);
        scheduleCleanup(id, jobDir);
        return;
      }

      const files = readdirSync(jobDir)
        .map((name) => join(jobDir, name))
        .filter((p) => {
          try { return statSync(p).isFile(); } catch { return false; }
        })
        .sort((a, b) => statSync(b).size - statSync(a).size);

      if (!files.length) {
        job.status = "error";
        job.error = "Download produced no file.";
        emitter.emit("progress", { ...job.progress, phase: "Error" });
        emitter.emit("done", job);
        scheduleCleanup(id, jobDir);
        return;
      }

      const filePath = files[0];
      const baseName = filePath.split(/[\\/]/).pop() ?? `download-${randomUUID()}`;

      job.status = "done";
      job.filePath = filePath;
      job.downloadName = safeName(baseName);
      job.progress = { percent: 100, phase: "Ready to download" };
      emitter.emit("progress", { ...job.progress });
      emitter.emit("done", job);
      scheduleCleanup(id, jobDir);
    });
  })();

  return job;
}

function scheduleCleanup(id: string, jobDir: string) {
  setTimeout(() => {
    const j = jobs.get(id);
    if (j) {
      try { rmSync(jobDir, { recursive: true, force: true }); } catch { /* ignore */ }
      jobs.delete(id);
    }
  }, JOB_TTL_MS);
}

function cleanError(msg: string): string {
  return friendlyYtDlpError(msg);
}
