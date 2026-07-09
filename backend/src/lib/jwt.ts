import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface TokenPayload {
  uid: string;
}

export interface TotpTicketPayload {
  uid: string;
  purpose: "totp";
}

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, config.auth.jwtSecret, {
    expiresIn: `${config.auth.sessionDays}d`,
  });
}

/** Short-lived ticket between password step and TOTP verification (5 min). */
export function signTotpTicket(userId: string): string {
  return jwt.sign({ uid: userId, purpose: "totp" }, config.auth.jwtSecret, {
    expiresIn: "5m",
  });
}

export function verifyTotpTicket(token: string): string | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    if (
      typeof decoded === "object" &&
      decoded &&
      "uid" in decoded &&
      (decoded as Record<string, unknown>).purpose === "totp"
    ) {
      return String((decoded as Record<string, unknown>).uid);
    }
    return null;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    if (typeof decoded === "object" && decoded && "uid" in decoded) {
      return { uid: String((decoded as Record<string, unknown>).uid) };
    }
    return null;
  } catch {
    return null;
  }
}
