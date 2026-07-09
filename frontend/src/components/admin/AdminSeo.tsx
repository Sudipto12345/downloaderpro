import { useEffect, useState } from "react";
import { adminGetGsc, adminGetSettings, adminUpdateGsc, adminUpdateSettings, type RouteSeoOverride } from "@/lib/db";
import {
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { AdminImageUpload } from "@/components/admin/AdminImageUpload";

type SiteForm = {
  name: string;
  shortName: string;
  url: string;
  description: string;
  twitter: string;
  ogImage: string;
  locale: string;
  logoUrl: string;
  faviconUrl: string;
};

export default function AdminSeo() {
  const [site, setSite] = useState<SiteForm>({
    name: "",
    shortName: "",
    url: "",
    description: "",
    twitter: "",
    ogImage: "",
    locale: "en_US",
    logoUrl: "",
    faviconUrl: "",
  });
  const [seo, setSeo] = useState({ defaultTitle: "", defaultDescription: "", defaultKeywords: "" });
  const [gsc, setGsc] = useState({
    verificationContent: "",
    propertyUrl: "",
    googleAnalyticsId: "",
    customHeadHtml: "",
  });
  const [routeSeo, setRouteSeo] = useState<RouteSeoOverride[]>([{ path: "/", title: "", description: "", keywords: [], noindex: false }]);
  const [flags, setFlags] = useState({
    publicAccounts: false,
    publicPricing: false,
    publicDashboard: false,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminGetSettings(), adminGetGsc()])
      .then(([s, g]) => {
        setSite({
          name: s.site.name ?? "",
          shortName: s.site.shortName ?? "",
          url: s.site.url ?? "",
          description: s.site.description ?? "",
          twitter: s.site.twitter ?? "",
          ogImage: s.site.ogImage ?? "",
          locale: s.site.locale ?? "en_US",
          logoUrl: s.site.logoUrl ?? "",
          faviconUrl: s.site.faviconUrl ?? "",
        });
        setSeo({
          defaultTitle: s.seo.defaultTitle,
          defaultDescription: s.seo.defaultDescription,
          defaultKeywords: s.seo.defaultKeywords.join(", "),
        });
        setGsc({
          verificationContent: g.verificationContent ?? "",
          propertyUrl: g.propertyUrl ?? "",
          googleAnalyticsId: g.googleAnalyticsId ?? "",
          customHeadHtml: g.customHeadHtml ?? "",
        });
        setRouteSeo(s.routeSeo?.length ? s.routeSeo : [{ path: "/", title: "", description: "", keywords: [], noindex: false }]);
        setFlags({
          publicAccounts: s.flags.publicAccounts,
          publicPricing: s.flags.publicPricing,
          publicDashboard: s.flags.publicDashboard,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    await Promise.all([
      adminUpdateSettings({
        site,
        seo: {
          defaultTitle: seo.defaultTitle,
          defaultDescription: seo.defaultDescription,
          defaultKeywords: seo.defaultKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        },
        flags,
        routeSeo,
      }),
      adminUpdateGsc(gsc),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sharePreview = site.ogImage
    ? site.ogImage.startsWith("http")
      ? site.ogImage
      : `${site.url.replace(/\/$/, "")}${site.ogImage.startsWith("/") ? site.ogImage : `/${site.ogImage}`}`
    : "";

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Site & SEO Settings"
        description="Logo, favicon, share image, meta tags, and feature flags — saved to the database and served to the live site."
        actions={<Button onClick={handleSave}>{saved ? "Saved!" : "Save settings"}</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Site identity</h4>
          <div className="space-y-3">
            <AdminInput
              placeholder="Site name"
              value={site.name}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
            />
            <AdminInput
              placeholder="Short name (navbar)"
              value={site.shortName}
              onChange={(e) => setSite({ ...site, shortName: e.target.value })}
            />
            <AdminInput
              placeholder="Site URL (https://tinydown.com)"
              value={site.url}
              onChange={(e) => setSite({ ...site, url: e.target.value })}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sitemap target</p>
              <p className="mt-1 break-all">{site.url.replace(/\/$/, "")}/sitemap.xml</p>
            </div>
            <AdminInput
              placeholder="Locale (en_US)"
              value={site.locale}
              onChange={(e) => setSite({ ...site, locale: e.target.value })}
            />
            <AdminInput
              placeholder="Twitter @handle"
              value={site.twitter}
              onChange={(e) => setSite({ ...site, twitter: e.target.value })}
            />
            <AdminTextarea
              placeholder="Site description"
              value={site.description}
              onChange={(e) => setSite({ ...site, description: e.target.value })}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Branding & social share</h4>
          <div className="space-y-4">
            <AdminImageUpload
              label="Logo"
              kind="logo"
              value={site.logoUrl}
              onChange={(url) => setSite({ ...site, logoUrl: url })}
            />
            <AdminImageUpload
              label="Favicon"
              kind="favicon"
              value={site.faviconUrl}
              onChange={(url) => setSite({ ...site, faviconUrl: url })}
            />
            <AdminImageUpload
              label="Social share image (OG)"
              kind="og"
              value={site.ogImage}
              onChange={(url) => setSite({ ...site, ogImage: url })}
              hint="Used when links are shared on Facebook, X, WhatsApp, etc."
            />
            {sharePreview && (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <img src={sharePreview} alt="Share preview" className="max-h-40 w-full object-cover" />
                <p className="border-t bg-slate-50 px-3 py-2 text-xs text-slate-500">Social share preview</p>
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Default SEO</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput
              placeholder="Default title"
              value={seo.defaultTitle}
              onChange={(e) => setSeo({ ...seo, defaultTitle: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminTextarea
              placeholder="Default meta description"
              value={seo.defaultDescription}
              onChange={(e) => setSeo({ ...seo, defaultDescription: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminInput
              placeholder="Keywords (comma separated)"
              value={seo.defaultKeywords}
              onChange={(e) => setSeo({ ...seo, defaultKeywords: e.target.value })}
              className="sm:col-span-2"
            />
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Route SEO overrides</h4>
          <p className="mb-4 text-xs text-slate-500">
            Override title, description, keywords, or noindex status for specific routes such as /tools or /pricing.
          </p>
          <div className="space-y-3">
            {routeSeo.map((entry, index) => (
              <div key={`${entry.path}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminInput
                    placeholder="Route path (e.g. /tools)"
                    value={entry.path}
                    onChange={(e) => {
                      const next = [...routeSeo];
                      next[index] = { ...entry, path: e.target.value };
                      setRouteSeo(next);
                    }}
                    className="sm:col-span-2"
                  />
                  <AdminInput
                    placeholder="Override title"
                    value={entry.title ?? ""}
                    onChange={(e) => {
                      const next = [...routeSeo];
                      next[index] = { ...entry, title: e.target.value };
                      setRouteSeo(next);
                    }}
                  />
                  <AdminInput
                    placeholder="Override description"
                    value={entry.description ?? ""}
                    onChange={(e) => {
                      const next = [...routeSeo];
                      next[index] = { ...entry, description: e.target.value };
                      setRouteSeo(next);
                    }}
                  />
                  <AdminInput
                    placeholder="Keywords (comma separated)"
                    value={(entry.keywords ?? []).join(", ")}
                    onChange={(e) => {
                      const next = [...routeSeo];
                      next[index] = {
                        ...entry,
                        keywords: e.target.value
                          .split(",")
                          .map((k) => k.trim())
                          .filter(Boolean),
                      };
                      setRouteSeo(next);
                    }}
                    className="sm:col-span-2"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={entry.noindex ?? false}
                      onChange={(e) => {
                        const next = [...routeSeo];
                        next[index] = { ...entry, noindex: e.target.checked };
                        setRouteSeo(next);
                      }}
                    />
                    Noindex this route
                  </label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRouteSeo([...routeSeo, { path: "/", title: "", description: "", keywords: [], noindex: false }])}
            >
              Add route rule
            </Button>
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Custom head tags</h4>
          <p className="mb-4 text-xs text-slate-500">
            Add Search Console verification, Google Analytics, and any custom meta/link/script tags to inject into every page head.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput
              placeholder="Property URL (https://example.com/)"
              value={gsc.propertyUrl}
              onChange={(e) => setGsc({ ...gsc, propertyUrl: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminInput
              placeholder="Search Console verification content"
              value={gsc.verificationContent}
              onChange={(e) => setGsc({ ...gsc, verificationContent: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminInput
              placeholder="Google Analytics ID (G-XXXXXXXX)"
              value={gsc.googleAnalyticsId}
              onChange={(e) => setGsc({ ...gsc, googleAnalyticsId: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminTextarea
              placeholder={'<meta name="robots" content="index, follow" />\n<link rel="canonical" href="https://example.com/" />'}
              value={gsc.customHeadHtml}
              onChange={(e) => setGsc({ ...gsc, customHeadHtml: e.target.value })}
              className="min-h-[180px] font-mono text-xs sm:col-span-2"
            />
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <h4 className="mb-2 text-sm font-bold text-slate-900">Feature flags</h4>
        <p className="mb-4 text-xs text-slate-500">
          Toggle public features without redeploying.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["publicAccounts", "Public accounts"],
              ["publicPricing", "Public pricing"],
              ["publicDashboard", "User dashboard"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm"
            >
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="font-medium text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
