import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getMyDownloads, type DownloadRecord } from "@/lib/db";
import { Seo } from "@/components/Seo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PlanCard from "@/components/dashboard/PlanCard";
import HistoryTable, { getPlatformColor, formatRelativeTime } from "@/components/dashboard/HistoryTable";
import FavoritesList from "@/components/dashboard/FavoritesList";
import ProfileCard from "@/components/dashboard/ProfileCard";
import { Download, History, Star, User, ShieldAlert, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "favorites" | "profile">("overview");
  const [recentDownloads, setRecentDownloads] = useState<DownloadRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyDownloads()
      .then((list) => {
        if (!cancelled) setRecentDownloads(list.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setRecentDownloads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Seo
        title="Dashboard"
        description="View your DownloadHub Pro dashboard, manage your download history, starred items, and subscription details."
        path="/dashboard"
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, <span className="gradient-text">{user.name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your downloads, favorites, and account details in one place.
          </p>
        </div>

        {user.role === "admin" && (
          <a href="/admin">
            <Button variant="outline" className="h-10 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-2">
              <ShieldAlert className="h-4 w-4" /> Admin Panel
            </Button>
          </a>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-border/40 pb-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "history"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" /> History
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "favorites"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Star className="h-4 w-4" /> Favorites
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" /> Profile
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-8">
        {activeTab === "overview" && (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Left/Middle: Recent activity */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <h3 className="text-lg font-bold">Recent Downloads</h3>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="flex items-center gap-1 text-sm text-primary hover:text-accent font-semibold transition-colors"
                  >
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {recentDownloads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Download className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">You haven't downloaded anything yet.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {recentDownloads.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-secondary/10 p-3 hover:bg-secondary/20 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-14 shrink-0 overflow-hidden rounded bg-secondary">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center">
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-foreground/90">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-muted-foreground">
                              {formatRelativeTime(item.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold border ${getPlatformColor(item.platform)}`}>
                            {item.platform}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: Plan Info */}
            <div>
              <PlanCard />
            </div>
          </div>
        )}

        {activeTab === "history" && <HistoryTable />}

        {activeTab === "favorites" && <FavoritesList />}

        {activeTab === "profile" && <ProfileCard />}
      </div>
    </div>
  );
}
