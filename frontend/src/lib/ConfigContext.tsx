import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchPublicConfig, type PublicConfig } from "./db";

interface ConfigCtx {
  config: PublicConfig;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigCtx | null>(null);

const FALLBACK: PublicConfig = {
  flags: { publicAccounts: false, publicPricing: false, publicDashboard: false },
  site: {
    name: "TinyDown",
    shortName: "TinyDown",
    url: "https://tinydown.com",
    description: "Download videos and audio from your favourite platforms.",
    twitter: "@tinydown",
    ogImage: "/og-image.png",
    locale: "en_US",
    logoUrl: "",
    faviconUrl: "",
  },
  seoDefaults: {
    defaultTitle: "TinyDown — Download Video, Image & Audio",
    defaultDescription: "Download videos and audio from 1000+ sites.",
    defaultKeywords: ["video downloader", "tinydown"],
  },
  theme: {
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
  },
  siteOnline: true,
  downloadToolEnabled: true,
  maintenanceMessage: "",
  gsc: { verificationContent: "", googleAnalyticsId: "", customHeadHtml: "" },
  totalDownloads: 0,
  menus: [],
  ads: [],
  pages: [],
  toolOrder: [],
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await fetchPublicConfig();
      setConfig(data);
    } catch {
      setConfig(FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(
    () => ({ config: config ?? FALLBACK, loading, refresh }),
    [config, loading]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigCtx {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used inside <ConfigProvider>");
  return ctx;
}

export function useSite() {
  return useConfig().config.site;
}

export function useFlags() {
  return useConfig().config.flags;
}
