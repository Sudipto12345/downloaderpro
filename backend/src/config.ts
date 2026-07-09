import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  pythonBin: process.env.PYTHON_BIN ?? "python",
  isProduction,
  rate: {
    guestDownloadsPerDay: Number(process.env.GUEST_DOWNLOADS_PER_DAY ?? 10),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
    /** JWT + cookie lifetime in days */
    sessionDays: Number(process.env.SESSION_DAYS ?? 30),
    cookieName: "dhp_token",
    /** Send the cookie only over HTTPS. Enable once TLS is set up (see DEPLOY.md). */
    cookieSecure: process.env.COOKIE_SECURE === "true",
  },
  ytdlp: {
    /** Spoof X-Forwarded-For to bypass geo-restrictions (on by default). */
    geoBypass: process.env.YTDLP_GEO_BYPASS !== "false",
    /** Force a specific country for the geo-bypass header, e.g. "US", "GB". */
    geoBypassCountry: (process.env.YTDLP_GEO_BYPASS_COUNTRY ?? "").trim().toUpperCase(),
    /** Route yt-dlp through an HTTP/SOCKS proxy, e.g. "http://user:pass@host:port". */
    proxy: (process.env.YTDLP_PROXY ?? "").trim(),
    /** Path to a Netscape-format cookies.txt for age/region/login-gated content. */
    cookiesFile: (process.env.YTDLP_COOKIES ?? "").trim(),
    timeout: Number(process.env.YTDLP_TIMEOUT ?? 60),
    retries: Number(process.env.YTDLP_RETRIES ?? 5),
    concurrent: Number(process.env.YTDLP_CONCURRENT ?? 2),
  },
  vpn: {
    /** Provider id or "auto" for priority-based failover. Use "none" to skip VPN framework. */
    provider: (process.env.VPN_PROVIDER ?? "auto").trim().toLowerCase(),
    /** Default target country when none specified (ISO 3166-1 alpha-2). */
    country: (process.env.VPN_COUNTRY ?? "BD").trim().toUpperCase(),
    autoReconnect: process.env.AUTO_RECONNECT !== "false",
    verifyPublicIp: process.env.VERIFY_PUBLIC_IP !== "false",
    /** Local proxy exposed by host VPN manager (e.g. socks5://host.docker.internal:1080). */
    localProxyUrl: (process.env.VPN_LOCAL_PROXY_URL ?? "").trim(),
  },
};
