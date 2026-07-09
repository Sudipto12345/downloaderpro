import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useConfig } from "@/lib/ConfigContext";
import { trackPageView } from "@/lib/track";
import { useAppStore } from "@/store";
import { Footer } from "./Footer";
import { GlobalAds } from "./AdSlot";
import { Navbar } from "./Navbar";
import { ThemeApplicator } from "./ThemeApplicator";
import { SiteMetaTags } from "./SiteMetaTags";

function upsertFavicon(href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "icon";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function Layout() {
  const { pathname } = useLocation();
  const { config } = useConfig();
  const setResult = useAppStore((s) => s.setResult);
  const setUrl = useAppStore((s) => s.setUrl);

  const { hash } = useLocation();

  useEffect(() => {
    if (config.site.faviconUrl) upsertFavicon(config.site.faviconUrl);
  }, [config.site.faviconUrl]);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
    // reset any previous analysis when switching tools/pages
    setResult(null);
    setUrl("");
  }, [pathname, hash, setResult, setUrl]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <ThemeApplicator />
      <SiteMetaTags />
      <Navbar />
      {config.siteOnline === false ? (
        <main className="grid flex-1 place-items-center px-4 py-20 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold">We'll be back soon</h1>
            <p className="mt-3 text-muted-foreground">
              {config.maintenanceMessage || "The site is temporarily unavailable."}
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1">
          <Outlet />
        </main>
      )}
      <Footer />
      <GlobalAds />
    </div>
  );
}
