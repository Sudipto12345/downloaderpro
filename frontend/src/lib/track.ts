const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function trackUrl(): string {
  const base = API_BASE || window.location.origin;
  return `${base.replace(/\/$/, "")}/api/public/track`;
}

export function trackPageView(path: string): void {
  void fetch(trackUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ type: "pageview", path }),
    keepalive: true,
  }).catch(() => undefined);
}

export function trackAdImpression(placement: string): void {
  void fetch(trackUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ type: "ad_impression", placement }),
    keepalive: true,
  }).catch(() => undefined);
}

export function trackAdClick(placement: string): void {
  void fetch(trackUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ type: "ad_click", placement }),
    keepalive: true,
  }).catch(() => undefined);
}
