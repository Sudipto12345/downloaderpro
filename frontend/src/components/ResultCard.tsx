import { CheckCircle2, Clock, Download, Loader2, AlertCircle, Lock, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { useFlags } from "@/lib/ConfigContext";
import {
  addGuestDownload,
  getGuestTodayCount,
  getMyTodayCount,
  recordDownload,
} from "@/lib/db";
import { getEffectivePlan, isDevUnlimited } from "@/lib/dev";
import {
  streamDownloadToBrowser,
  type DownloadProgress,
  type MediaInfo,
} from "@/lib/api";

type DownloadState = "idle" | "starting" | "downloading" | "done" | "error";

export function ResultCard({ info, url }: { info: MediaInfo; url: string }) {
  const { user } = useAuth();
  const flags = useFlags();
  const navigate = useNavigate();
  const [choice, setChoice] = useState(info.options[0]?.id ?? "best");
  const [state, setState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setChoice(info.options[0]?.id ?? "best");
    setState("idle");
    setProgress(null);
    setError(null);
  }, [info]);

  // Elapsed timer
  useEffect(() => {
    if (state === "downloading" || state === "starting") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Guest users get free-tier limits without signing in (unlimited in Vite dev)
  const plan = flags.publicAccounts ? getEffectivePlan(user?.planId ?? "free") : getEffectivePlan("business");
  const [todayCount, setTodayCount] = useState<number>(() =>
    user ? 0 : getGuestTodayCount()
  );

  // Load today's download count (server-side for users, local for guests)
  useEffect(() => {
    let cancelled = false;
    if (user) {
      getMyTodayCount()
        .then((c) => {
          if (!cancelled) setTodayCount(c);
        })
        .catch(() => {
          if (!cancelled) setTodayCount(0);
        });
    } else {
      setTodayCount(getGuestTodayCount());
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isLimitExceeded =
    flags.publicAccounts &&
    plan.maxDownloadsPerDay !== -1 &&
    todayCount >= plan.maxDownloadsPerDay;

  // Find currently selected option
  const selectedOpt = info.options.find((o) => o.id === choice);
  const isSelectedLocked =
    flags.publicAccounts &&
    (selectedOpt?.height ? selectedOpt.height > plan.maxResolution : false);

  const handleDownload = useCallback(async () => {
    if (isLimitExceeded) {
      navigate("/#pricing");
      return;
    }

    if (isSelectedLocked) {
      navigate("/#pricing");
      return;
    }

    setState("starting");
    setProgress(null);
    setError(null);
    setElapsed(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setState("downloading");

      await streamDownloadToBrowser(
        url,
        choice,
        info.title,
        (p) => setProgress(p),
        controller.signal,
        selectedOpt?.ytdlpFormat
      );

      setState("done");

      if (user) {
        try {
          await recordDownload({
            title: info.title,
            platform: info.extractor || "Unknown",
            url: url,
            quality: selectedOpt?.label || choice,
            thumbnail: info.thumbnail || undefined,
          });
          setTodayCount((c) => c + 1);
        } catch {
          /* history recording is best-effort; don't block the file download */
        }
      } else {
        addGuestDownload();
        setTodayCount(getGuestTodayCount());
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState("error");
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }, [url, choice, user, isLimitExceeded, isSelectedLocked, info, selectedOpt, navigate]);

  const percent = progress?.percent ?? 0;
  const isActive = state === "starting" || state === "downloading";

  return (
    <Card className="mx-auto mt-2 grid max-w-3xl animate-fade-up gap-5 p-4 sm:grid-cols-[300px_1fr] sm:gap-6 sm:p-5">
      <div className="relative overflow-hidden rounded-xl">
        {info.thumbnail ? (
          <img
            src={info.thumbnail}
            alt={info.title}
            className="aspect-video w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-secondary text-sm text-muted-foreground">
            No preview
          </div>
        )}
        {info.duration && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
            <Clock className="h-3 w-3" />
            {info.duration}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {info.extractor && (
          <span className="mb-2 w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-primary">
            {info.extractor}
          </span>
        )}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
          {info.title}
        </h3>
        {info.uploader && (
          <p className="mt-1 text-sm text-muted-foreground">by {info.uploader}</p>
        )}

        <div className="mt-auto pt-5">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Choose format &amp; quality
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <select
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                disabled={isActive}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-secondary px-4 pr-9 text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {info.options.map((opt) => {
                  let lockLabel = "";
                  if (opt.height && opt.height > plan.maxResolution) {
                    lockLabel =
                      opt.height >= 1440 ? " (Requires Business — 2K/4K/8K)" : " (Requires Pro)";
                  }
                  
                  return (
                    <option key={opt.id} value={opt.id}>
                      {opt.note ? `${opt.label} — ${opt.note}` : opt.label}
                      {lockLabel}
                    </option>
                  );
                })}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            
            <Button
              size="lg"
              onClick={handleDownload}
              disabled={isActive}
              variant={isLimitExceeded || isSelectedLocked ? "secondary" : "download"}
              className="sm:px-7"
            >
              {isActive ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {state === "starting" ? "Starting…" : `${Math.round(percent)}%`}
                </>
              ) : isLimitExceeded ? (
                <>Upgrade to Download</>
              ) : isSelectedLocked ? (
                <>Upgrade Quality</>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download
                </>
              )}
            </Button>
          </div>

          {selectedOpt?.note && state === "idle" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: <strong className="text-foreground">{selectedOpt.label}</strong>
              {selectedOpt.note ? ` · ${selectedOpt.note}` : ""}
            </p>
          )}

          {/* Gating messages — only when public accounts enabled */}
          {flags.publicAccounts && !user && !isLimitExceeded && !isSelectedLocked && !isDevUnlimited && (
            <p className="mt-2 text-xs text-muted-foreground">
              Free mode: {plan.maxDownloadsPerDay} downloads/day, up to {plan.maxResolution}p.
            </p>
          )}

          {flags.publicAccounts && isLimitExceeded && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Daily download limit reached ({todayCount}/{plan.maxDownloadsPerDay}). Upgrade for unlimited downloads!
            </p>
          )}

          {flags.publicAccounts && !isLimitExceeded && isSelectedLocked && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Selected quality exceeds your plan limits. Please upgrade to unlock higher resolutions.
            </p>
          )}

          {/* ── Progress bar ── */}
          {isActive && (
            <div className="mt-4 animate-fade-up space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">
                  {state === "starting" ? "Preparing download…" : progress?.phase ?? "Downloading…"}
                </span>
                <span className="font-mono tabular-nums text-primary">
                  {state === "starting" ? "…" : `${Math.round(percent)}%`}
                </span>
              </div>
              {/* Bar track */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                {/* Animated gradient fill */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.max(percent, state === "starting" ? 0 : 1)}%`,
                    background:
                      "linear-gradient(90deg, hsl(252 95% 68%), hsl(286 92% 66%), hsl(252 95% 68%))",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s linear infinite",
                  }}
                />
                {/* Glow effect */}
                {percent > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full blur-sm"
                    style={{
                      width: `${percent}%`,
                      background: "hsl(252 95% 68% / 0.4)",
                    }}
                  />
                )}
              </div>

              {/* Stats row */}
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  {/* Phase */}
                  <span className="font-medium text-foreground">
                    {progress?.phase ?? "Preparing…"}
                  </span>
                  {/* Size */}
                  {progress?.totalSize && (
                    <span className="hidden sm:inline">
                      {progress.totalSize}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Speed */}
                  {progress?.speed && (
                    <span className="font-mono tabular-nums">
                      ⚡ {progress.speed}
                    </span>
                  )}
                  {/* ETA */}
                  {progress?.eta && progress.eta !== "00:00" && (
                    <span className="font-mono tabular-nums">
                      ETA {progress.eta}
                    </span>
                  )}
                  {/* Elapsed */}
                  <span className="font-mono tabular-nums text-muted-foreground/70">
                    {formatElapsed(elapsed)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {state === "done" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-fade-up">
              <CheckCircle2 className="h-3.5 w-3.5" /> Done! Check your downloads folder.
              <span className="ml-auto font-mono text-muted-foreground/70">
                {formatElapsed(elapsed)}
              </span>
            </p>
          )}

          {/* ── Error ── */}
          {state === "error" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 animate-fade-up">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
