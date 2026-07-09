import { useEffect } from "react";
import { useConfig } from "@/lib/ConfigContext";

/** Applies DB-driven theme tokens to the public site. */
export function ThemeApplicator() {
  const { config } = useConfig();
  const t = config.theme;

  useEffect(() => {
    if (!t) return;
    const root = document.documentElement;
    root.style.setProperty("--download-btn-bg", t.downloadButtonBg);
    root.style.setProperty("--download-btn-text", t.downloadButtonText);
    root.style.setProperty("--hero-from", t.heroGradientFrom);
    root.style.setProperty("--hero-to", t.heroGradientTo);
    root.style.setProperty("--navbar-title-color", t.navbarTitleColor || "inherit");
    root.style.setProperty("--hero-title-color", t.heroTitleColor);
    root.style.setProperty("--hero-subtitle-color", t.heroSubtitleColor);
    root.style.setProperty("--navbar-logo-size", `${t.navbarLogoSizePx}px`);
  }, [t]);

  useEffect(() => {
    const css = t?.customCss?.trim() ?? "";
    const id = "site-custom-css";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!css) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = css;
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [t?.customCss]);

  return null;
}
