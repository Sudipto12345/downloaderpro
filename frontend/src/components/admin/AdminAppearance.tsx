import { useEffect, useState } from "react";
import { adminGetSettings, adminUpdateSettings, type ThemeConfig } from "@/lib/db";
import {
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { AdminImageUpload } from "@/components/admin/AdminImageUpload";

const DEFAULT_THEME: ThemeConfig = {
  downloadButtonBg: "hsl(233.5, 100%, 48.8%)",
  downloadButtonText: "#ffffff",
  heroGradientFrom: "hsl(261.8, 100%, 37.3%)",
  heroGradientTo: "hsl(303.8, 100%, 50%)",
  navbarTitleColor: "",
  navbarSuffixText: "",
  navbarSuffixUseGradient: true,
  navbarLogoSizePx: 36,
  heroTitleColor: "#ffffff",
  heroSubtitleColor: "rgba(255,255,255,0.85)",
  customCss: "",
};

export default function AdminAppearance() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [site, setSite] = useState({ shortName: "", logoUrl: "" });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetSettings()
      .then((s) => {
        setTheme({ ...DEFAULT_THEME, ...s.theme });
        setSite({ shortName: s.site.shortName ?? "", logoUrl: s.site.logoUrl ?? "" });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await adminUpdateSettings({
      theme,
      site: { shortName: site.shortName, logoUrl: site.logoUrl },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Appearance & Header"
        description="Customize the public header logo, brand text, download button colors, and hero panel styling."
        actions={<Button onClick={save}>{saved ? "Saved!" : "Save appearance"}</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Header / navbar</h4>
          <div className="space-y-3">
            <AdminInput
              placeholder="Brand text (navbar)"
              value={site.shortName}
              onChange={(e) => setSite({ ...site, shortName: e.target.value })}
            />
            <AdminImageUpload
              label="Header logo"
              kind="logo"
              value={site.logoUrl}
              onChange={(url) => setSite({ ...site, logoUrl: url })}
            />
            <AdminInput
              placeholder="Suffix after brand (e.g. Pro)"
              value={theme.navbarSuffixText}
              onChange={(e) => setTheme({ ...theme, navbarSuffixText: e.target.value })}
            />
            <AdminInput
              placeholder="Navbar title color (CSS, optional)"
              value={theme.navbarTitleColor}
              onChange={(e) => setTheme({ ...theme, navbarTitleColor: e.target.value })}
            />
            <AdminInput
              type="number"
              placeholder="Logo size (px)"
              value={theme.navbarLogoSizePx}
              onChange={(e) =>
                setTheme({ ...theme, navbarLogoSizePx: Number(e.target.value) || 36 })
              }
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={theme.navbarSuffixUseGradient}
                onChange={(e) => setTheme({ ...theme, navbarSuffixUseGradient: e.target.checked })}
              />
              Gradient style on suffix text
            </label>
            {(site.logoUrl || site.shortName) && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {site.logoUrl && (
                  <img
                    src={site.logoUrl}
                    alt=""
                    style={{ width: theme.navbarLogoSizePx, height: theme.navbarLogoSizePx }}
                    className="rounded-xl object-cover"
                  />
                )}
                <span className="font-bold" style={{ color: theme.navbarTitleColor || undefined }}>
                  {site.shortName || "Brand"}{" "}
                  <span className={theme.navbarSuffixUseGradient ? "gradient-text" : ""}>
                    {theme.navbarSuffixText}
                  </span>
                </span>
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Download button</h4>
          <div className="space-y-3">
            <AdminInput
              placeholder="Button background (CSS color)"
              value={theme.downloadButtonBg}
              onChange={(e) => setTheme({ ...theme, downloadButtonBg: e.target.value })}
            />
            <AdminInput
              placeholder="Button text color"
              value={theme.downloadButtonText}
              onChange={(e) => setTheme({ ...theme, downloadButtonText: e.target.value })}
            />
            <button
              type="button"
              className="rounded-full px-8 py-3 text-sm font-semibold shadow-lg"
              style={{
                background: theme.downloadButtonBg,
                color: theme.downloadButtonText,
              }}
            >
              Download preview
            </button>
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Hero panel</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput
              placeholder="Gradient from (CSS)"
              value={theme.heroGradientFrom}
              onChange={(e) => setTheme({ ...theme, heroGradientFrom: e.target.value })}
            />
            <AdminInput
              placeholder="Gradient to (CSS)"
              value={theme.heroGradientTo}
              onChange={(e) => setTheme({ ...theme, heroGradientTo: e.target.value })}
            />
            <AdminInput
              placeholder="Hero title color"
              value={theme.heroTitleColor}
              onChange={(e) => setTheme({ ...theme, heroTitleColor: e.target.value })}
            />
            <AdminInput
              placeholder="Hero subtitle color"
              value={theme.heroSubtitleColor}
              onChange={(e) => setTheme({ ...theme, heroSubtitleColor: e.target.value })}
            />
          </div>
          <div
            className="mt-4 rounded-2xl p-8 text-center"
            style={{
              background: `linear-gradient(135deg, ${theme.heroGradientFrom}, ${theme.heroGradientTo})`,
            }}
          >
            <p className="text-2xl font-bold" style={{ color: theme.heroTitleColor }}>
              Download Video, Audio & Images
            </p>
            <p className="mt-2 text-sm" style={{ color: theme.heroSubtitleColor }}>
              Paste a link and save to your device.
            </p>
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Custom CSS</h4>
          <p className="mb-3 text-xs text-slate-500">
            Optional site-wide CSS. Use variables like <code className="text-violet-600">--download-btn-bg</code> or
            target <code className="text-violet-600">.hero-panel</code>, <code className="text-violet-600">.btn-download</code>.
          </p>
          <AdminTextarea
            rows={10}
            placeholder={`.hero-panel { border-radius: 1.5rem; }\n.btn-download { border-radius: 999px; }`}
            value={theme.customCss ?? ""}
            onChange={(e) => setTheme({ ...theme, customCss: e.target.value })}
            className="font-mono text-xs"
          />
        </AdminCard>
      </div>
    </div>
  );
}
