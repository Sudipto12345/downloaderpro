export interface FormatOption {
  id: string;
  label: string;
  kind: "video" | "audio" | "image";
  height?: number;
  note?: string;
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

export interface DownloadProgress {
  status: "pending" | "downloading" | "merging" | "done" | "error";
  percent?: number;
  speed?: string;
  eta?: string;
  totalSize?: string;
  phase?: string;
  error?: string;
  downloadUrl?: string;
  downloadName?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE) return `${API_BASE.replace(/\/$/, "")}${normalized}`;
  return `${window.location.origin}${normalized}`;
}

function filenameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      return utf8;
    }
  }
  return header.match(/filename="?([^";]+)"?/i)?.[1];
}

export async function analyzeUrl(url: string): Promise<MediaInfo> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to analyze the URL.");
  return data as MediaInfo;
}

export function buildStreamDownloadUrl(
  url: string,
  choice: string,
  title?: string,
  ytdlpFormat?: string
): string {
  const params = new URLSearchParams({ url, choice });
  if (title) params.set("title", title.slice(0, 120));
  if (ytdlpFormat) params.set("format", ytdlpFormat);
  return resolveApiUrl(`/api/download/stream?${params.toString()}`);
}

export function buildDownloadUrl(
  url: string,
  choice: string,
  title?: string,
  ytdlpFormat?: string
): string {
  return buildStreamDownloadUrl(url, choice, title, ytdlpFormat);
}

/**
 * Stream file directly to the visitor's browser — nothing stored on the server.
 */
export async function streamDownloadToBrowser(
  url: string,
  choice: string,
  title: string,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
  ytdlpFormat?: string
): Promise<void> {
  const streamUrl = buildStreamDownloadUrl(url, choice, title, ytdlpFormat);
  const res = await fetch(streamUrl, { signal, credentials: "include" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Download failed (${res.status}).`);
  }

  const total = Number(res.headers.get("Content-Length")) || 0;
  const ext = choice === "audio" ? "mp3" : choice === "image" ? "jpg" : "mp4";
  const fallbackName = `${title.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120)}.${ext}`;
  const saveAs = filenameFromDisposition(res.headers.get("Content-Disposition")) ?? fallbackName;

  if (!res.body) {
    throw new Error("No download stream received.");
  }

  onProgress?.({ status: "downloading", phase: "Connecting to server…", percent: 2 });

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  let lastTick = Date.now();
  let displayPercent = 2;

  const formatBytes = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      const now = Date.now();
      if (total > 0) {
        displayPercent = Math.min(99, (received / total) * 100);
      } else if (now - lastTick > 400) {
        // No Content-Length — pulse progress so users see activity
        displayPercent = Math.min(92, displayPercent + 4 + Math.random() * 6);
        lastTick = now;
      }
      onProgress?.({
        status: "downloading",
        phase: total > 0 ? `Downloading… ${formatBytes(received)}` : `Downloading… ${formatBytes(received)} received`,
        percent: displayPercent,
        totalSize: total > 0 ? formatBytes(total) : formatBytes(received),
      });
    }
  }

  const blob = new Blob(chunks);
  if (!blob.size) {
    throw new Error("Downloaded file is empty.");
  }

  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = saveAs;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  onProgress?.({ status: "done", phase: "Complete — saved to your device", percent: 100 });
}
