import { useEffect, useMemo, useState } from "react";
import {
  adminGetGsc,
  adminPingSitemap,
  adminUpdateGsc,
  type ActiveHeadTag,
  type GscConfig,
} from "@/lib/db";
import {
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Radar, Tag } from "lucide-react";

const STEPS = [
  "Open Google Search Console and click **Add property**.",
  "Choose **URL prefix** and enter your live site URL (must match Site URL in SEO settings, e.g. `https://tinydown.com`).",
  "Under verification, pick **HTML tag** and copy only the `content=\"...\"` value (not the full meta tag).",
  "Paste that value below, click **Save**, then restart the web container OR wait ~1 min and click **Verify** in Search Console.",
  "If HTML tag fails, use the **HTML file** method — upload the file Google gives you is served automatically at `https://tinydown.com/google<token>.html`.",
  "Add extra SEO meta/link/script tags in the **Head HTML editor** below — no tag count limit.",
  "After verified, submit your sitemap URL in Search Console → **Sitemaps**.",
];

const SOURCE_LABELS: Record<ActiveHeadTag["source"], string> = {
  gsc: "Search Console",
  ga4: "Analytics",
  custom: "Custom HTML",
};

export default function AdminSearchConsole() {
  const [data, setData] = useState<(GscConfig & { sitemapUrl: string; activeTags: ActiveHeadTag[] }) | null>(
    null
  );
  const [form, setForm] = useState({
    verificationContent: "",
    propertyUrl: "",
    googleAnalyticsId: "",
    customHeadHtml: "",
  });
  const [saved, setSaved] = useState(false);
  const [pingMsg, setPingMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () =>
    adminGetGsc()
      .then((g) => {
        setData(g);
        setForm({
          verificationContent: g.verificationContent ?? "",
          propertyUrl: g.propertyUrl ?? "",
          googleAnalyticsId: g.googleAnalyticsId ?? "",
          customHeadHtml: g.customHeadHtml ?? "",
        });
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const previewTags = useMemo(() => {
    const tags: ActiveHeadTag[] = [];
    const verification = form.verificationContent.trim();
    if (verification) {
      tags.push({
        source: "gsc",
        kind: "meta",
        label: "google-site-verification",
        snippet: `<meta name="google-site-verification" content="${verification}" />`,
      });
    }
    const gaId = form.googleAnalyticsId.trim();
    if (gaId.startsWith("G-")) {
      tags.push({
        source: "ga4",
        kind: "script",
        label: gaId,
        snippet: `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`,
      });
    }
    const customMatches = form.customHeadHtml.match(/<(meta|link|script)\b[^>]*>/gi) ?? [];
    for (const snippet of customMatches) {
      const kind = snippet.match(/^<(\w+)/i)?.[1]?.toLowerCase() ?? "tag";
      const label =
        snippet.match(/\bname=["']([^"']+)["']/i)?.[1] ??
        snippet.match(/\bproperty=["']([^"']+)["']/i)?.[1] ??
        snippet.match(/\brel=["']([^"']+)["']/i)?.[1] ??
        snippet.slice(0, 80);
      tags.push({ source: "custom", kind, label, snippet: snippet.trim() });
    }
    return tags;
  }, [form]);

  const save = async () => {
    const updated = await adminUpdateGsc(form);
    setData(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ping = async () => {
    setPingMsg("");
    const res = await adminPingSitemap();
    setPingMsg(res.ok ? "Sitemap ping sent to Google." : `Ping returned HTTP ${res.status}.`);
    load();
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  if (loading || !data) return <AdminLoading />;

  const gscRealtimeUrl = data.propertyUrl
    ? `https://search.google.com/search-console?resource_id=${encodeURIComponent(data.propertyUrl.replace(/\/$/, "") + "/")}`
    : "https://search.google.com/search-console";

  const activeTags = previewTags.length ? previewTags : data.activeTags ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Google Search Console"
        description="Verify your site, edit head HTML tags, submit sitemaps, and monitor search performance."
        actions={
          <>
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" /> Open Search Console
            </a>
            <Button onClick={save}>{saved ? "Saved!" : "Save settings"}</Button>
          </>
        }
      />

      <AdminCard>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Radar className="h-4 w-4 text-violet-600" /> Setup instructions
        </h4>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          {STEPS.map((step, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </ol>
      </AdminCard>

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Tag className="h-4 w-4 text-emerald-600" /> Active head tags ({activeTags.length})
          </h4>
          <p className="text-xs text-slate-500">Live preview of tags injected on every page — unlimited count.</p>
        </div>
        {activeTags.length === 0 ? (
          <p className="text-sm text-slate-500">No tags configured yet. Add verification or head HTML below.</p>
        ) : (
          <ul className="space-y-2">
            {activeTags.map((tag, i) => (
              <li key={`${tag.source}-${tag.label}-${i}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {SOURCE_LABELS[tag.source]}
                  </span>
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                    {tag.kind}
                  </span>
                  <span className="text-xs font-medium text-slate-700">{tag.label}</span>
                </div>
                <code className="block overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-600">
                  {tag.snippet}
                </code>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Verification</h4>
          <div className="space-y-3">
            <AdminInput
              placeholder="Property URL (https://tinydown.com/)"
              value={form.propertyUrl}
              onChange={(e) => setForm({ ...form, propertyUrl: e.target.value })}
            />
            <AdminInput
              placeholder='HTML tag content value (e.g. abc123XYZ...)'
              value={form.verificationContent}
              onChange={(e) => setForm({ ...form, verificationContent: e.target.value })}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Sitemap URL</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate text-sm text-slate-800">{data.sitemapUrl}</code>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-white"
                  onClick={() => copy(data.sitemapUrl)}
                  title="Copy sitemap URL"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Use this exact URL in Search Console → Sitemaps and keep it pointing to your public domain.
              </p>
            </div>
            {form.verificationContent && (
              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Meta tag injected on page load + in static HTML after container restart.
                </p>
                <p>
                  HTML file URL (alternate):{" "}
                  <code className="rounded bg-slate-100 px-1">
                    {(form.propertyUrl || "https://tinydown.com").replace(/\/$/, "")}/google{form.verificationContent}.html
                  </code>
                </p>
              </div>
            )}
            <AdminInput
              placeholder="Google Analytics ID (optional, G-XXXXXXXX)"
              value={form.googleAnalyticsId}
              onChange={(e) => setForm({ ...form, googleAnalyticsId: e.target.value })}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Sitemap & realtime</h4>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Sitemap URL</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate text-sm text-slate-800">{data.sitemapUrl}</code>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-white"
                  onClick={() => copy(data.sitemapUrl)}
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={ping}>
              Ping Google sitemap
            </Button>
            {pingMsg && <p className="text-xs text-slate-600">{pingMsg}</p>}
            {data.lastSitemapPingAt && (
              <p className="text-xs text-slate-500">
                Last ping: {new Date(data.lastSitemapPingAt).toLocaleString()}
              </p>
            )}
            <a
              href={gscRealtimeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Radar className="h-4 w-4" /> Open realtime report (24h)
            </a>
            <p className="text-xs text-slate-500">
              In Search Console → <strong>Performance</strong> → filter <strong>Last 24 hours</strong> for near-realtime clicks and impressions.
            </p>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <h4 className="mb-2 text-sm font-bold text-slate-900">Head HTML editor</h4>
        <p className="mb-4 text-xs text-slate-500">
          Paste any number of <code>&lt;meta&gt;</code>, <code>&lt;link&gt;</code>, or <code>&lt;script&gt;</code> tags for SEO,
          verification, or analytics. Tags are injected into every page head (SPA + static HTML on container restart). No tag limit.
        </p>
        <AdminTextarea
          placeholder={'<meta name="robots" content="index, follow" />\n<link rel="alternate" href="https://example.com/" hreflang="en" />'}
          value={form.customHeadHtml}
          onChange={(e) => setForm({ ...form, customHeadHtml: e.target.value })}
          className="min-h-[180px] font-mono text-xs"
        />
      </AdminCard>
    </div>
  );
}
