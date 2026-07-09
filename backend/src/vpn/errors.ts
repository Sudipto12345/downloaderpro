import type { RetryPolicy } from "./types.js";

export type ErrorCategory =
  | "geo_restricted"
  | "http_403"
  | "http_451"
  | "proxy_failure"
  | "vpn_disconnected"
  | "dns_failure"
  | "timeout"
  | "auth_required"
  | "unsupported"
  | "unknown";

export function classifyYtDlpError(message: string): { category: ErrorCategory; retryPolicy: RetryPolicy } {
  const full = message.replace(/\x1b\[[0-9;]*m/g, "").trim();

  if (
    /available in your country|geo-?restrict|use a VPN or a proxy|blocked it in your country|not available from your location/i.test(
      full
    )
  ) {
    return {
      category: "geo_restricted",
      retryPolicy: { maxAttempts: 3, retryable: true, reason: "geo_restricted" },
    };
  }
  if (/\b403\b|forbidden/i.test(full)) {
    return { category: "http_403", retryPolicy: { maxAttempts: 2, retryable: true, reason: "http_403" } };
  }
  if (/\b451\b|unavailable for legal/i.test(full)) {
    return { category: "http_451", retryPolicy: { maxAttempts: 1, retryable: false, reason: "http_451" } };
  }
  if (/proxy|socks|tunnel|connection refused|ECONNREFUSED|proxy error/i.test(full)) {
    return {
      category: "proxy_failure",
      retryPolicy: { maxAttempts: 3, retryable: true, reason: "proxy_failure" },
    };
  }
  if (/vpn|tun|wireguard|openvpn|tailscale|network is down/i.test(full)) {
    return {
      category: "vpn_disconnected",
      retryPolicy: { maxAttempts: 3, retryable: true, reason: "vpn_disconnected" },
    };
  }
  if (/dns|name resolution|ENOTFOUND|getaddrinfo/i.test(full)) {
    return { category: "dns_failure", retryPolicy: { maxAttempts: 2, retryable: true, reason: "dns_failure" } };
  }
  if (/timeout|timed out|ETIMEDOUT/i.test(full)) {
    return { category: "timeout", retryPolicy: { maxAttempts: 2, retryable: true, reason: "timeout" } };
  }
  if (
    /\bprivate\b.*(?:video|account|post|content)|requires? login|login required|sign in to|members.?only/i.test(
      full
    )
  ) {
    return { category: "auth_required", retryPolicy: { maxAttempts: 1, retryable: false, reason: "auth_required" } };
  }
  if (/unsupported url/i.test(full)) {
    return { category: "unsupported", retryPolicy: { maxAttempts: 1, retryable: false, reason: "unsupported" } };
  }
  return { category: "unknown", retryPolicy: { maxAttempts: 1, retryable: false, reason: "unknown" } };
}

export function friendlyYtDlpError(message: string): string {
  const full = message.replace(/\x1b\[[0-9;]*m/g, "").trim();
  const { category } = classifyYtDlpError(full);

  if (/\[Instagram\]/i.test(full)) {
    if (/login required|rate-?limit|empty media|use --cookies/i.test(full)) {
      return "Instagram blocked this download from the server. In Admin → Geo & Network, upload Instagram session cookies (export cookies.txt while logged in to instagram.com), then try again.";
    }
  }

  if (category === "geo_restricted") {
    const where = full.match(/available in ([A-Z][A-Za-z .,'-]+?)\.?\s*$/m);
    const region = where ? ` It's only available in ${where[1].trim()}.` : "";
    return `This video is geo-restricted and can't be reached from the server's region.${region} Configure a VPN or proxy for that country in the admin panel or via VPN_COUNTRY / provider credentials.`;
  }
  if (category === "http_403") return "Access was denied (403). The content may be blocked or require authentication.";
  if (category === "http_451") return "This content is unavailable for legal reasons in your region (451).";
  if (category === "proxy_failure")
    return "The download proxy failed. The system will try another provider automatically on retry.";
  if (category === "vpn_disconnected") return "VPN connection was lost. Reconnecting and retrying.";
  if (category === "dns_failure") return "DNS resolution failed. Check network and VPN DNS settings.";
  if (category === "timeout") return "The download timed out. Try again or switch provider/country.";
  if (category === "auth_required") return "This content is private or requires login.";
  if (category === "unsupported") return "This URL is not supported.";

  let m = full;
  const errLine = full
    .split("\n")
    .reverse()
    .find((l) => l.includes("ERROR"));
  if (errLine) m = errLine.replace("ERROR:", "").trim();
  return m.slice(0, 300);
}
