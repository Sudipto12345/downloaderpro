import { useEffect, useState } from "react";
import {
  adminGetAnalytics,
  adminPurgeStorage,
  adminResetStats,
  type Analytics,
} from "@/lib/db";
import {
  AdminBadge,
  AdminCard,
  AdminLoading,
  AdminPageHeader,
  AdminStatCard,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Calendar,
  Database,
  Download,
  Eye,
  HardDrive,
  Megaphone,
  MousePointerClick,
  Trash2,
  Users,
  Wifi,
} from "lucide-react";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    adminGetAnalytics()
      .then(setData)
      .catch(() => setData(null));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleResetStats = async () => {
    if (!confirm("Reset all counters (downloads, traffic, ads) and purge old daily stats?")) return;
    setBusy(true);
    await adminResetStats(7).catch(() => undefined);
    refresh();
    setBusy(false);
  };

  const handlePurgeStorage = async () => {
    if (!confirm("Delete all temporary download files from server storage?")) return;
    setBusy(true);
    await adminPurgeStorage().catch(() => undefined);
    refresh();
    setBusy(false);
  };

  if (!data) return <AdminLoading />;

  const metrics = data.dailyMetrics ?? data.dailyCounts.map((d) => ({
    date: d.date,
    downloads: d.count,
    pageViews: 0,
    adClicks: 0,
    adImpressions: 0,
  }));

  const maxBar = Math.max(
    ...metrics.flatMap((d) => [d.downloads, d.pageViews, d.adClicks]),
    1
  );

  const plans = data.planDistribution;
  const planTotal = plans.free + plans.pro + plans.business || 1;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Traffic, downloads, ads, storage, and system health — all connected to PostgreSQL."
        actions={
          <>
            <Button variant="outline" size="sm" disabled={busy} onClick={handleResetStats}>
              <Trash2 className="h-4 w-4" /> Reset stats
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={handlePurgeStorage}>
              <HardDrive className="h-4 w-4" /> Purge temp files
            </Button>
          </>
        }
      />

      {/* System status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminCard>
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl ${data.system?.database ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
            >
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Database</p>
              <p className="text-xs text-slate-500">
                {data.system?.database ? "Connected (PostgreSQL)" : "Disconnected"}
              </p>
            </div>
            <AdminBadge variant={data.system?.database ? "success" : "warning"}>
              {data.system?.database ? "OK" : "Error"}
            </AdminBadge>
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <Wifi className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Backend API</p>
              <p className="text-xs text-slate-500">Express + Prisma</p>
            </div>
            <AdminBadge variant="success">Online</AdminBadge>
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Active ad slots</p>
              <p className="text-xs text-slate-500">{data.enabledAds ?? 0} placements enabled</p>
            </div>
            <p className="ml-auto text-xs font-semibold text-violet-600">Ads tab →</p>
          </div>
        </AdminCard>
      </div>

      {/* KPI row */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Page views"
          value={(data.totalPageViews ?? 0).toLocaleString()}
          hint={`${data.pageViewsToday ?? 0} today`}
          icon={Eye}
          accent="blue"
        />
        <AdminStatCard
          label="Downloads"
          value={data.totalDownloads.toLocaleString()}
          hint={`${data.downloadsToday} today`}
          icon={Download}
          accent="primary"
        />
        <AdminStatCard
          label="Ad clicks"
          value={(data.totalAdClicks ?? 0).toLocaleString()}
          hint={`${data.adClicksToday ?? 0} today · ${data.totalAdImpressions ?? 0} impressions`}
          icon={MousePointerClick}
          accent="amber"
        />
        <AdminStatCard
          label="Users"
          value={data.totalUsers}
          hint={`${formatBytes(data.storage?.totalBytes ?? 0)} temp storage`}
          icon={Users}
          accent="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic chart */}
        <AdminCard>
          <div className="mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-900">Traffic & downloads — 7 days</h3>
          </div>
          <div className="flex h-48 items-end gap-2">
            {metrics.map((day) => {
              const dlH = (day.downloads / maxBar) * 100;
              const pvH = (day.pageViews / maxBar) * 100;
              const formattedDate = new Date(day.date).toLocaleDateString(undefined, { weekday: "short" });
              return (
                <div key={day.date} className="group relative flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-40 w-full items-end justify-center gap-0.5">
                    <div
                      style={{ height: `${Math.max(4, pvH)}%` }}
                      className="w-[42%] rounded-t bg-blue-400"
                      title={`${day.pageViews} views`}
                    />
                    <div
                      style={{ height: `${Math.max(4, dlH)}%` }}
                      className="w-[42%] rounded-t bg-violet-500"
                      title={`${day.downloads} downloads`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-slate-500">{formattedDate}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" /> Page views
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Downloads
            </span>
          </div>
        </AdminCard>

        {/* Plan distribution */}
        <AdminCard>
          <div className="mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">User plans</h3>
          </div>
          <div className="space-y-4">
            {(
              [
                ["free", "Free", "bg-slate-400"],
                ["pro", "Pro", "bg-violet-500"],
                ["business", "Business", "bg-emerald-500"],
              ] as const
            ).map(([key, label, color]) => {
              const count = plans[key];
              const pct = Math.round((count / planTotal) * 100);
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>
      </div>

      {/* Ad placement stats */}
      <AdminCard padding={false}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Ad placements</h3>
          <p className="text-xs text-slate-500">Clicks and impressions tracked per slot</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase text-slate-500">
                <th className="px-5 py-3 font-semibold">Placement</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Impressions</th>
                <th className="px-5 py-3 font-semibold">Clicks</th>
                <th className="px-5 py-3 font-semibold">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.adStats ?? []).map((row) => {
                const ctr =
                  row.impressions > 0 ? `${((row.clicks / row.impressions) * 100).toFixed(1)}%` : "—";
                return (
                  <tr key={row.placement} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{row.placement.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3">
                      <AdminBadge variant={row.enabled ? "success" : "warning"}>
                        {row.enabled ? "On" : "Off"}
                      </AdminBadge>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{row.impressions.toLocaleString()}</td>
                    <td className="px-5 py-3 tabular-nums">{row.clicks.toLocaleString()}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-500">{ctr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
