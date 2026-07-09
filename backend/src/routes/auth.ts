import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { signToken, signTotpTicket, verifyTotpTicket } from "../lib/jwt.js";
import { isPublicAccountsEnabled } from "../lib/settings.js";
import { adminRequiresTotp } from "../lib/users.js";
import { createTotpSecret, getTotpQrDataUrl, verifyTotpCode } from "../lib/totp.js";
import { loadUser, requireAuth, toSafeUser } from "../middleware/auth.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.auth.cookieSecure,
  maxAge: config.auth.sessionDays * 24 * 60 * 60 * 1000,
  path: "/",
};

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.string().trim().email("Please enter a valid email.").max(160),
  password: z.string().min(6, "Password must be at least 6 characters long.").max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

const totpVerifySchema = z.object({
  ticket: z.string().min(1),
  code: z.string().min(6).max(8),
});

const totpEnableSchema = z.object({
  code: z.string().min(6).max(8),
});

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input.";
}

function issueSession(res: import("express").Response, userId: string) {
  res.cookie(config.auth.cookieName, signToken(userId), cookieOptions);
}

/* Register — only when publicAccounts flag is on */
authRouter.post("/register", async (req, res) => {
  if (!(await isPublicAccountsEnabled())) {
    return res.status(404).json({ error: "Registration is not available." });
  }
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, role: "user", planId: "free" },
  });

  issueSession(res, user.id);
  return res.status(201).json(toSafeUser(user));
});

/* Login — admin-only when publicAccounts is off */
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }
  const { email, password } = parsed.data;
  const publicAccounts = await isPublicAccountsEnabled();

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(401).json({ error: "No account found with this email." });
  }
  if (!publicAccounts && user.role !== "admin") {
    return res.status(403).json({ error: "Login is restricted to administrators." });
  }
  if (user.banned) {
    return res.status(403).json({ error: "This account has been suspended." });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  // TOTP only when required (exempt developers / totpExempt admins)
  if (adminRequiresTotp(user) && user.totpEnabled && user.totpSecret) {
    return res.json({
      needsTotp: true,
      ticket: signTotpTicket(user.id),
      totpEnabled: true,
    });
  }

  if (adminRequiresTotp(user) && !user.totpEnabled) {
    return res.json({
      needsTotpSetup: true,
      ticket: signTotpTicket(user.id),
      totpEnabled: false,
    });
  }

  issueSession(res, user.id);
  return res.json(toSafeUser(user, { self: true }));
});

/* Verify TOTP code after password step */
authRouter.post("/login/verify", async (req, res) => {
  const parsed = totpVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }
  const uid = verifyTotpTicket(parsed.data.ticket);
  if (!uid) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || !user.totpSecret || !user.totpEnabled) {
    return res.status(401).json({ error: "Invalid verification session." });
  }
  if (!(await verifyTotpCode(user.totpSecret, parsed.data.code))) {
    return res.status(401).json({ error: "Invalid authentication code." });
  }

  issueSession(res, user.id);
  return res.json(toSafeUser(user, { self: true }));
});

/* TOTP setup — returns QR for first-time enrollment (requires ticket from login) */
authRouter.post("/totp/setup", async (req, res) => {
  const ticket = String(req.body?.ticket ?? "");
  const uid = verifyTotpTicket(ticket);
  if (!uid) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  const secret = user.totpSecret ?? createTotpSecret();
  if (!user.totpSecret) {
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
  }

  const qrDataUrl = await getTotpQrDataUrl(user.email, secret);
  return res.json({ qrDataUrl, secret });
});

/* Enable TOTP after scanning QR */
authRouter.post("/totp/enable", async (req, res) => {
  const ticket = String(req.body?.ticket ?? "");
  const uid = verifyTotpTicket(ticket);
  if (!uid) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  const parsed = totpEnableSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || !user.totpSecret) {
    return res.status(400).json({ error: "TOTP not initialized. Call /totp/setup first." });
  }
  if (!(await verifyTotpCode(user.totpSecret, parsed.data.code))) {
    return res.status(401).json({ error: "Invalid authentication code. Try again." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });

  issueSession(res, user.id);
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  return res.json(toSafeUser(updated!, { self: true }));
});

/* Logout */
authRouter.post("/logout", (_req, res) => {
  res.clearCookie(config.auth.cookieName, { ...cookieOptions, maxAge: undefined });
  return res.json({ ok: true });
});

/* Current user */
authRouter.get("/me", async (req, res) => {
  const user = await loadUser(req);
  if (!user) return res.json(null);
  return res.json(toSafeUser(user, { self: true }));
});

/* Update own profile (name) */
const profileSchema = z.object({ name: z.string().trim().min(1, "Name cannot be empty.").max(80) });

authRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name: parsed.data.name },
  });
  return res.json(toSafeUser(updated));
});

/* Mock plan upgrade (only when public accounts enabled) */
const planSchema = z.object({ planId: z.enum(["free", "pro", "business"]) });

authRouter.post("/me/plan", requireAuth, async (req, res) => {
  if (!(await isPublicAccountsEnabled())) {
    return res.status(404).json({ error: "Plan upgrades are not available." });
  }
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstError(parsed.error) });
  }
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { planId: parsed.data.planId },
  });
  return res.json(toSafeUser(updated));
});
