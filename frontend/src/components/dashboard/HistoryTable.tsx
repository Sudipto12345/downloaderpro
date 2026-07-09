import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  getMyDownloads,
  getMyFavorites,
  toggleFavorite,
  type DownloadRecord,
} from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Download, ExternalLink, Star } from "lucide-react";

// Simple relative time formatter
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function getPlatformColor(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("youtube")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  if (p.includes("instagram")) return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
  if (p.includes("tiktok")) return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
  if (p.includes("facebook")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (p.includes("twitter") || p === "x") return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  return "bg-primary/10 text-primary border-primary/20";
}

export default function HistoryTable() {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [favoritedUrls, setFavoritedUrls] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getMyDownloads(), getMyFavorites()])
      .then(([dls, favs]) => {
        if (cancelled) return;
        setDownloads(dls);
        setFavoritedUrls(new Set(favs.map((f) => f.url)));
      })
      .catch(() => {
        if (!cancelled) {
          setDownloads([]);
          setFavoritedUrls(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = downloads.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.platform.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleFavorite = async (record: DownloadRecord) => {
    if (!user) return;
    const favorited = await toggleFavorite({
      title: record.title,
      platform: record.platform,
      url: record.url,
      thumbnail: record.thumbnail,
    }).catch(() => null);
    if (favorited === null) return;
    setFavoritedUrls((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(record.url);
      else next.delete(record.url);
      return next;
    });
  };

  if (!user) return null;

  return (
    <Card className="border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Download History</h3>
          <p className="text-sm text-muted-foreground">List of your recently downloaded videos and media.</p>
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search downloads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border border-input bg-secondary/30 pl-9 pr-4 text-sm focus:border-primary"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <Download className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-base font-semibold">No downloads found</h4>
          <p className="max-w-xs text-sm text-muted-foreground">
            {search ? "No matches found for your search term." : "Your downloaded files will show up here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Media</th>
                <th className="pb-3 pr-4 font-semibold">Platform</th>
                <th className="pb-3 pr-4 font-semibold">Quality</th>
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((item) => {
                const isFav = favoritedUrls.has(item.url);
                return (
                  <tr key={item.id} className="group hover:bg-secondary/20">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-secondary">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-secondary">
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                          <p className="line-clamp-2 font-medium text-foreground hover:text-primary transition-colors">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge className={`border ${getPlatformColor(item.platform)}`}>
                        {item.platform}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-mono text-xs text-muted-foreground">{item.quality}</span>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {formatRelativeTime(item.date)}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleFavorite(item)}
                          className={`rounded-lg p-2 transition-colors ${
                            isFav ? "text-amber-500 dark:text-amber-400 hover:bg-amber-400/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Open original link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
