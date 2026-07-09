import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";
import { PlatformLogo } from "@/components/logos/PlatformLogo";
import { useConfig } from "@/lib/ConfigContext";
import { orderTools, toolsToPlatformNav } from "@/lib/orderedTools";
import type { Tool } from "@/data/tools";
import { analyzeUrl } from "@/lib/api";
import { useAppStore } from "@/store";
import { ResultCard } from "./ResultCard";

export function DownloaderTool({ tool, compact = false }: { tool: Tool; compact?: boolean }) {
  const { url, setUrl, result, setResult } = useAppStore();
  const { config } = useConfig();
  const downloadEnabled = config.downloadToolEnabled !== false;
  const platformTabs = toolsToPlatformNav(orderTools(config.toolOrder));

  const mutation = useMutation({
    mutationFn: (value: string) => analyzeUrl(value),
    onSuccess: (data) => setResult(data),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    setResult(null);
    mutation.mutate(value);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section id="top" className="relative">
      {/* Brand-colored hero panel */}
      <div className="hero-panel">
        <div className={`mx-auto max-w-4xl px-4 text-center sm:px-6 ${compact ? "py-10 sm:py-14" : "py-12 sm:py-20"}`}>
          {!compact && (
            <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white/20 p-1.5 shadow-lg backdrop-blur-sm sm:mb-5 sm:h-12 sm:w-12 sm:rounded-2xl sm:p-2">
              <PlatformLogo platform={tool.platformId} />
            </div>
          )}

          <h1
            className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl"
            style={{ color: config.theme?.heroTitleColor ?? "#ffffff" }}
          >
            {tool.h1}
          </h1>
          {!compact && (
            <p
              className="mx-auto mt-3 max-w-lg text-pretty text-sm sm:text-base"
              style={{ color: config.theme?.heroSubtitleColor ?? "rgba(255,255,255,0.85)" }}
            >
              {tool.subtitle}
            </p>
          )}

          {/* Platform tabs — scroll on small screens */}
          <div className="mx-auto mt-5 max-w-2xl overflow-x-auto px-1 pb-1 scrollbar-none sm:mt-6">
            <div className="flex w-max min-w-full items-center justify-center gap-1.5 sm:gap-2">
              {platformTabs.map((item) => (
                <Link
                  key={item.slug}
                  to={item.home ? "/" : `/${item.slug}`}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center sm:h-4 sm:w-4">
                    <PlatformLogo platform={item.platformId} />
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Big search / download bar */}
          {downloadEnabled ? (
          <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-3xl">
            <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:p-1.5">
              <div className="flex flex-1 items-center gap-2 px-3 sm:px-4">
                <Search className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={tool.placeholder}
                  aria-label={`${tool.platform} URL`}
                  className="h-12 w-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:h-14 sm:text-base"
                />
              </div>
              <div className="flex items-center gap-2 px-1 sm:pr-1">
                {!url && (
                  <button
                    type="button"
                    onClick={paste}
                    className="hidden shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary sm:block"
                  >
                    Paste
                  </button>
                )}
                <Button
                  type="submit"
                  variant="download"
                  size="lg"
                  disabled={mutation.isPending}
                  className="h-12 w-full shrink-0 rounded-xl px-8 sm:h-14 sm:w-auto sm:rounded-full sm:px-10"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Download
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
          ) : (
            <p className="mx-auto mt-8 max-w-lg rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">
              Downloads are temporarily disabled. Please check back later.
            </p>
          )}

          <AdSlot placement="below_search" className="mx-auto mt-6 max-w-3xl" />

          {mutation.isError && (
            <p className="mx-auto mt-5 max-w-xl rounded-xl border border-red-300/50 bg-red-500/20 px-4 py-3 text-sm text-white">
              {(mutation.error as Error).message}
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-background px-4 pb-8 pt-6 sm:px-6">
          <ResultCard info={result} url={url.trim()} />
        </div>
      )}
    </section>
  );
}
