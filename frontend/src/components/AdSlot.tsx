import { useEffect, useRef } from "react";
import { useConfig } from "@/lib/ConfigContext";
import type { AdPlacement } from "@/lib/db";
import { trackAdClick, trackAdImpression } from "@/lib/track";
import { cn } from "@/lib/utils";

export function AdSlot({
  placement,
  className,
}: {
  placement: AdPlacement;
  className?: string;
}) {
  const { config } = useConfig();
  const ref = useRef<HTMLDivElement>(null);
  const ad = config.ads.find((a) => a.placement === placement);
  const tracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ad?.code) return;
    el.innerHTML = ad.code;
    const scripts = el.querySelectorAll("script");
    scripts.forEach((old) => {
      const script = document.createElement("script");
      for (const attr of old.attributes) {
        script.setAttribute(attr.name, attr.value);
      }
      if (old.textContent) script.textContent = old.textContent;
      old.replaceWith(script);
    });
    if (!tracked.current) {
      tracked.current = true;
      trackAdImpression(placement);
    }
  }, [ad?.code, placement]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ad?.code) return;
    const onClick = () => trackAdClick(placement);
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [ad?.code, placement]);

  if (!ad?.code) return null;

  return <div ref={ref} className={cn("ad-slot w-full", className)} data-ad={placement} />;
}

/** Mount popup / sticky / social ads once globally. */
export function GlobalAds() {
  return (
    <>
      <AdSlot placement="popup" />
      <AdSlot placement="sticky_bar" className="fixed bottom-0 left-0 right-0 z-40" />
      <AdSlot placement="social_bar" />
      <AdSlot placement="direct_link" className="sr-only" />
    </>
  );
}
