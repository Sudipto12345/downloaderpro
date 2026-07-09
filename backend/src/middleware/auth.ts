import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { verifyToken } from "../lib/jwt.js";
import { isDeveloperUser } from "../lib/users.js";

/** Public-safe user shape (no password hash or TOTP secret). */
export type SafeUser = Omit<User, "passwordHash" | "totpSecret" | "isDeveloper"> & {
  isDeveloper?: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function toSafeUser(user: User, opts?: { self?: boolean }): SafeUser {
  const { passwordHash, totpSecret, isDeveloper, ...rest } = user;
  void passwordHash;
  void totpSecret;
  const safe: SafeUser = rest;
  if (opts?.self && isDeveloperUser(user)) {
    safe.isDeveloper = true;
  }
  return safe;
}

export async function loadUser(req: Request): Promise<User | null> {
  const token = req.cookies?.[config.auth.cookieName];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  return user ?? null;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (user) req.user = user;
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (user.banned) {
    return res.status(403).json({ error: "This account has been suspended." });
  }
  req.user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (user.banned) {
    return res.status(403).json({ error: "This account has been suspended." });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  req.user = user;
  next();
}

export async function requireDeveloper(req: Request, res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (!user || user.role !== "admin" || !isDeveloperUser(user)) {
    return res.status(404).json({ error: "Not found." });
  }
  if (user.banned) {
    return res.status(403).json({ error: "This account has been suspended." });
  }
  req.user = user;
  next();
}
