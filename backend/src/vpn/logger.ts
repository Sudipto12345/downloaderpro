/** Structured VPN logging — never logs secrets. */

const SENSITIVE = /password|passwd|token|secret|api[_-]?key|auth|credential|private[_-]?key/i;

function maskValue(key: string, value: unknown): unknown {
  if (typeof value === "string" && SENSITIVE.test(key)) {
    if (!value) return "";
    if (value.length <= 4) return "****";
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }
  if (typeof value === "string" && /proxy|socks|http:\/\//i.test(value)) {
    return value.replace(/:([^:@/]+)@/, ":****@");
  }
  return value;
}

function sanitize(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = maskValue(k, v);
  }
  return out;
}

export const vpnLog = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: "info", component: "vpn", message, ...sanitize(meta) }));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: "warn", component: "vpn", message, ...sanitize(meta) }));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "error", component: "vpn", message, ...sanitize(meta) }));
  },
};
