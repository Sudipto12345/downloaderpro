import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
  AdminSelect,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import {
  Eye,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  FileCode2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SitemapUrlOverride {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  title?: string;
}

const CHANGEFREQ_OPTIONS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const;
const PRIORITY_OPTIONS = ["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1"];

function adminGetSitemapOverrides(): Promise<SitemapUrlOverride[]> {
  return apiClient.get<SitemapUrlOverride[]>("/api/admin/sitemap-overrides");
}

function adminSaveSitemapOverrides(overrides: SitemapUrlOverride[]): Promise<SitemapUrlOverride[]> {
  return apiClient.put<SitemapUrlOverride[]>("/api/admin/sitemap-overrides", { overrides });
}

async function adminGetSitemapPreview(): Promise<string> {
  const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/admin/sitemap-preview`, { credentials: "include" });
  return res.text();
}

export default function AdminSitemap() {
  const [overrides, setOverrides] = useState<SitemapUrlOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"urls" | "preview">("urls");
  const [previewXml, setPreviewXml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    adminGetSitemapOverrides()
      .then(setOverrides)
      .catch(() => setOverrides([]))
      .finally(() => setLoading(false));
  }, []);

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const xml = await adminGetSitemapPreview();
      setPreviewXml(xml);
      setActiveTab("preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const addUrl = () => {
    setOverrides([
      ...overrides,
      { loc: "", changefreq: "weekly", priority: "0.8", title: "" },
    ]);
  };

  const removeUrl = (i: number) => {
    setOverrides(overrides.filter((_, idx) => idx !== i));
  };

  const updateUrl = (i: number, patch: Partial<SitemapUrlOverride>) => {
    const next = [...overrides];
    next[i] = { ...next[i], ...patch };
    setOverrides(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await adminSaveSitemapOverrides(
        overrides.filter((o) => o.loc.trim())
      );
      setOverrides(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sitemap Manager"
        description="Manage custom URLs in your sitemap.xml. The sitemap auto-includes all tool pages and CMS pages. Add extra URLs here to customize priority, frequency, or include external entries."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadPreview} disabled={previewLoading}>
              <Eye className={cn("mr-1.5 h-4 w-4", previewLoading && "animate-spin")} />
              {previewLoading ? "Loading…" : "Preview XML"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "urls", label: "Custom URL Overrides", icon: Plus },
          { id: "preview", label: "XML Preview", icon: FileCode2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => id === "preview" ? loadPreview() : setActiveTab("urls")}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === id
                ? "border border-b-white border-slate-200 bg-white text-violet-700 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "urls" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {overrides.length === 0
                ? "No custom URLs yet. The sitemap already auto-includes all tool pages and CMS pages."
                : `${overrides.length} custom URL entr${overrides.length === 1 ? "y" : "ies"}.`}
            </p>
            <Button variant="outline" size="sm" onClick={addUrl}>
              <Plus className="mr-1.5 h-4 w-4" /> Add URL
            </Button>
          </div>

          {overrides.length === 0 && (
            <AdminCard>
              <div className="py-8 text-center">
                <FileCode2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No custom URL overrides</p>
                <p className="mt-1 text-xs text-slate-400">
                  All tool pages and CMS pages are included automatically. Add custom entries to
                  override their priority/frequency, or to add external URLs to the sitemap.
                </p>
                <Button className="mt-4" size="sm" onClick={addUrl}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add first URL
                </Button>
              </div>
            </AdminCard>
          )}

          {overrides.map((entry, i) => (
            <AdminCard key={i}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">URL / path *</label>
                  <AdminInput
                    placeholder="https://tinydown.com/custom-page or /custom-page"
                    value={entry.loc}
                    onChange={(e) => updateUrl(i, { loc: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Page title (optional)</label>
                  <AdminInput
                    placeholder="TinyDown - Custom Page"
                    value={entry.title ?? ""}
                    onChange={(e) => updateUrl(i, { title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Last modified</label>
                  <AdminInput
                    type="date"
                    value={entry.lastmod ?? ""}
                    onChange={(e) => updateUrl(i, { lastmod: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Change frequency</label>
                  <AdminSelect
                    value={entry.changefreq ?? "weekly"}
                    onChange={(e) => updateUrl(i, { changefreq: e.target.value as SitemapUrlOverride["changefreq"] })}
                  >
                    {CHANGEFREQ_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </AdminSelect>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Priority</label>
                  <AdminSelect
                    value={entry.priority ?? "0.8"}
                    onChange={(e) => updateUrl(i, { priority: e.target.value })}
                  >
                    {PRIORITY_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </AdminSelect>
                </div>

                <div className="flex items-end sm:col-span-2 lg:col-span-4">
                  <button
                    type="button"
                    onClick={() => removeUrl(i)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            </AdminCard>
          ))}

          {overrides.length > 0 && (
            <div className="flex justify-end gap-3">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Saving…" : saved ? "Saved!" : "Save all changes"}
              </Button>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            <strong>Auto-included pages:</strong> Tool pages (YouTube, TikTok, etc.), CMS pages
            (published), and <code>/tools</code> are always in the sitemap automatically. Use overrides to
            change their priority/changefreq or add entirely new URLs.{" "}
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              View live sitemap.xml <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <AdminCard padding={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h4 className="font-semibold text-slate-900">Live sitemap.xml preview</h4>
            <Button variant="outline" size="sm" onClick={loadPreview} disabled={previewLoading}>
              <RefreshCw className={cn("mr-1.5 h-4 w-4", previewLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <pre className="max-h-[60vh] overflow-auto px-5 py-4 text-xs leading-relaxed text-slate-600">
            {previewXml || "Click 'Preview XML' to load the current sitemap."}
          </pre>
        </AdminCard>
      )}
    </div>
  );
}
