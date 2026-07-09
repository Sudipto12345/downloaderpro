export type { NetworkRoute, VpnConnection, PublicIpInfo, ProviderHealth } from "./types.js";
export { VpnManager, getVpnManager, withVpnFailover } from "./VpnManager.js";
export { friendlyYtDlpError, classifyYtDlpError } from "./errors.js";
export { normalizeCountryCode, isSupportedCountry, getCountryDefinitions } from "./countries.js";
export { getPublicIpInfo, countryMatches } from "./ipVerify.js";
export { vpnLog } from "./logger.js";
