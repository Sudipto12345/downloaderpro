import { useEffect, useState } from "react";
import {
  adminGetGeo,
  adminTestGeo,
  adminUpdateGeo,
  adminUploadInstagramCookies,
  type CountryProxy,
  type YtdlpGeoConfig,
} from "@/lib/db";
import {
  AdminBadge,
  AdminCard,
  AdminInput,
  AdminLabel,
  AdminLoading,
  AdminPageHeader,
  AdminSelect,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Globe, Plus, Trash2, Zap } from "lucide-react";

const COMMON_COUNTRIES: { code: string; label: string }[] = [
  { code: "BD", label: "Bangladesh" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "IN", label: "India" },
  { code: "PK", label: "Pakistan" },
  { code: "DE", label: "Germany" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "JP", label: "Japan" },
  { code: "BR", label: "Brazil" },
];

export default function AdminGeo() {
  const [config, setConfig] = useState<YtdlpGeoConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testUrl, setTestUrl] = useState("");
  const [testCountry, setTestCountry] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [cookieUploading, setCookieUploading] = useState(false);
  const [cookieMessage, setCookieMessage] = useState<string | null>(null);

  useEffect(() => {
    adminGetGeo()
      .then((c) => {
        setConfig(c);
        setTestCountry(c.defaultCountry);
      })
      .catch(() => setConfig(null));
  }, []);

  if (!config) return <AdminLoading />;

  const updateCountry = (index: number, patch: Partial<CountryProxy>) => {
    const next = [...config.countryProxies];
    next[index] = { ...next[index], ...patch };
    setConfig({ ...config, countryProxies: next });
  };

  const addCountry = () => {
    const unused = COMMON_COUNTRIES.find(
      (c) => !config.countryProxies.some((p) => p.country === c.code)
    );
    if (!unused) return;
    setConfig({
      ...config,
      countryProxies: [
        ...config.countryProxies,
        { country: unused.code, label: unused.label, proxy: "", enabled: true },
      ],
    });
  };

  const removeCountry = (index: number) => {
    setConfig({
      ...config,
      countryProxies: config.countryProxies.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await adminUpdateGeo(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminTestGeo(testUrl.trim(), testCountry || undefined);
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Success via ${res.country}: "${res.title}" (${res.optionsCount} formats)`,
        });
      } else {
        setTestResult({ ok: false, message: res.error || "Test failed." });
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Test failed.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCookieUpload = async (file: File) => {
    setCookieUploading(true);
    setCookieMessage(null);
    try {
      const content = await file.text();
      await adminUploadInstagramCookies(content);
      const refreshed = await adminGetGeo();
      setConfig(refreshed);
      setCookieMessage("Instagram cookies saved. Reels and posts should work now.");
    } catch (err: unknown) {
      setCookieMessage(err instanceof Error ? err.message : "Could not save cookies.");
    } finally {
      setCookieUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Country-wise Downloads"
        description="Route downloads through country-specific proxies to unlock region-locked videos. Hard YouTube geo-blocks require a real proxy in the allowed country."
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved!" : "Save configuration"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Globe className="h-4 w-4 text-violet-600" /> Global settings
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={config.geoBypass}
                onChange={(e) => setConfig({ ...config, geoBypass: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="font-medium text-slate-900">Enable geo bypass</span>
                <span className="block text-xs text-slate-500">Uses --xff or --geo-bypass when no country is set</span>
              </span>
            </label>

            <div>
              <AdminLabel htmlFor="defaultCountry">Default country (XFF)</AdminLabel>
              <AdminSelect
                id="defaultCountry"
                value={config.defaultCountry}
                onChange={(e) => setConfig({ ...config, defaultCountry: e.target.value })}
              >
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.code})
                  </option>
                ))}
              </AdminSelect>
            </div>

            <div>
              <AdminLabel htmlFor="fallbackProxy">Fallback proxy URL</AdminLabel>
              <AdminInput
                id="fallbackProxy"
                placeholder="socks5://user:pass@host:port or http://..."
                value={config.proxy}
                onChange={(e) => setConfig({ ...config, proxy: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">Used when no country-specific proxy is configured.</p>
            </div>

            <div>
              <AdminLabel htmlFor="cookies">General cookies file path (server)</AdminLabel>
              <AdminInput
                id="cookies"
                placeholder="/app/data/youtube-cookies.txt"
                value={config.cookiesFile}
                onChange={(e) => setConfig({ ...config, cookiesFile: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional path for YouTube or other sites. Instagram uses the upload below.
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Instagram session cookies</h3>
            <AdminBadge variant={config.instagramCookiesConfigured ? "success" : "warning"}>
              {config.instagramCookiesConfigured ? "Configured" : "Required for Instagram"}
            </AdminBadge>
          </div>
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-xs text-slate-600">
            <li>Log in to instagram.com in Firefox (recommended) or Chrome.</li>
            <li>
              Install the browser extension <strong>Get cookies.txt LOCALLY</strong> and export cookies for
              instagram.com.
            </li>
            <li>Upload the <code className="text-violet-600">cookies.txt</code> file below.</li>
            <li>Re-test a public reel URL. Sessions expire — re-upload if downloads stop working.</li>
          </ol>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-50">
            <input
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              disabled={cookieUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCookieUpload(file);
                e.target.value = "";
              }}
            />
            {cookieUploading ? "Uploading…" : "Browse & upload cookies.txt"}
          </label>
          {cookieMessage && (
            <p
              className={`mt-3 text-xs ${cookieMessage.includes("saved") ? "text-emerald-700" : "text-red-600"}`}
            >
              {cookieMessage}
            </p>
          )}
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Zap className="h-4 w-4 text-amber-500" /> Test connectivity
          </h3>
          <div className="space-y-4">
            <div>
              <AdminLabel htmlFor="testUrl">Video URL</AdminLabel>
              <AdminInput
                id="testUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
            </div>
            <div>
              <AdminLabel htmlFor="testCountry">Test as country</AdminLabel>
              <AdminSelect
                id="testCountry"
                value={testCountry}
                onChange={(e) => setTestCountry(e.target.value)}
              >
                {config.countryProxies.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.label} ({c.country})
                  </option>
                ))}
              </AdminSelect>
            </div>
            <Button variant="outline" onClick={handleTest} disabled={testing || !testUrl.trim()}>
              {testing ? "Testing…" : "Run test"}
            </Button>
            {testResult && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  testResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Per-country proxy routes</h3>
            <p className="text-xs text-slate-500">
              Enable a country and set its proxy to download region-locked content from that region.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addCountry}>
            <Plus className="h-4 w-4" /> Add country
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4 font-semibold">Country</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Proxy URL</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.countryProxies.map((row, index) => (
                <tr key={`${row.country}-${index}`}>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-violet-600">{row.country}</span>
                      <AdminInput
                        value={row.label}
                        onChange={(e) => updateCountry(index, { label: e.target.value })}
                        className="max-w-[160px]"
                      />
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateCountry(index, { enabled: e.target.checked })}
                      />
                      <AdminBadge variant={row.enabled ? "success" : "default"}>
                        {row.enabled ? "Active" : "Off"}
                      </AdminBadge>
                    </label>
                  </td>
                  <td className="py-4 pr-4">
                    <AdminInput
                      placeholder="socks5:// or http:// proxy in this country"
                      value={row.proxy}
                      onChange={(e) => updateCountry(index, { proxy: e.target.value })}
                    />
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() => removeCountry(index)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
