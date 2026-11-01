import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  burnPasswordCheck,
  hashPassword,
  passwordProblem,
  PASSWORD_MAX,
  verifyPassword,
} from "@/server/auth/password";
import { createSession, revokeOtherSessions } from "@/server/auth/session";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  matchingStep,
  otpauthUri,
} from "@/server/auth/totp";
import { db } from "@/server/db/client";
import { auditLog, users } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { clientIpHash } from "@/server/security/client-ip";
import { keyedHash, safeEqual } from "@/server/security/crypto";
import { enforce, hit, isLimited, RULES } from "@/server/security/rate-limit";

import { audit } from "./audit";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});

const GENERIC_FAILURE = "The email or password is incorrect.";

/**
 * Signs in with email and password. Failed attempts are rate-limited per IP and
 * per account; the response never reveals whether the account exists.
 */
export async function login(input: unknown, headers: Headers) {
  const { email, password } = loginSchema.parse(input);
  const ipHash = clientIpHash(headers);
  const accountKey = keyedHash("account", email);

  if (
    (await isLimited(RULES.loginFailuresPerIp, ipHash)) ||
    (await isLimited(RULES.loginFailuresPerAccount, accountKey))
  ) {
    // Count the attempt too, so hammering keeps the window full.
    await hit(RULES.loginFailuresPerIp, ipHash);
    throw new AppError("rate_limited", "Too many failed sign-in attempts. Try again later.");
  }

  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  const valid = user
    ? await verifyPassword(user.passwordHash, password)
    : (await burnPasswordCheck(password), false);

  if (!user || !valid) {
    await hit(RULES.loginFailuresPerIp, ipHash);
    await hit(RULES.loginFailuresPerAccount, accountKey);
    await audit({ userId: user?.id ?? null, action: "login_failed" });
    throw new AppError("unauthenticated", GENERIC_FAILURE);
  }

  if (user.totpEnabledAt) {
    // Password was right; the session is only created after the second factor.
    await audit({ userId: user.id, action: "login_password_ok" });
    return { mfaRequired: true as const, ticket: issueMfaTicket(user.id) };
  }
  return {
    mfaRequired: false as const,
    ...(await startSession(user.id, user.email, headers, "password")),
  };
}

async function startSession(userId: string, email: string, headers: Headers, method: string) {
  await db().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  const session = await createSession(userId, {
    ipHash: clientIpHash(headers),
    userAgent: headers.get("user-agent"),
  });
  await audit({ userId, action: "login", summary: { method } });
  return { user: { id: userId, email }, ...session };
}

// ---------------------------------------------------------------- two-factor sign-in

const MFA_TICKET_MS = 5 * 60 * 1000;

/** Proves the password step succeeded for this user in the last five minutes. */
function issueMfaTicket(userId: string, now = Date.now()): string {
  const payload = `${userId}.${now + MFA_TICKET_MS}`;
  return `${payload}.${keyedHash("mfa-ticket", payload)}`;
}

function readMfaTicket(ticket: string, now = Date.now()): string | null {
  const parts = ticket.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts as [string, string, string];
  if (!safeEqual(signature, keyedHash("mfa-ticket", `${userId}.${expires}`))) return null;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return null;
  return userId;
}

export const secondFactorSchema = z.object({
  ticket: z.string().min(1).max(200),
  code: z.string().trim().min(6).max(20),
});

/**
 * Checks a 6-digit code (each one usable once) or a recovery code (consumed
 * on use). Returns how the factor was satisfied, or null.
 */
async function checkSecondFactor(
  user: typeof users.$inferSelect,
  code: string,
): Promise<"totp" | "recovery" | null> {
  if (!user.totpSecret) return null;
  if (/^\d{6}$/.test(code)) {
    let secret: string;
    try {
      secret = decryptSecret(user.totpSecret);
    } catch {
      // APP_SECRET changed since enrolment: authenticator codes can no longer be
      // checked, but recovery codes (plain hashes) still work.
      logger.warn("stored TOTP secret cannot be decrypted; was APP_SECRET changed?");
      return null;
    }
    const step = matchingStep(secret, code);
    if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) return null;
    await db().update(users).set({ totpLastStep: step }).where(eq(users.id, user.id));
    return "totp";
  }
  const hash = hashRecoveryCode(code);
  if (!user.recoveryCodes.includes(hash)) return null;
  await db()
    .update(users)
    .set({ recoveryCodes: user.recoveryCodes.filter((h) => h !== hash), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return "recovery";
}

export async function completeSecondFactor(input: unknown, headers: Headers) {
  const { ticket, code } = secondFactorSchema.parse(input);
  const userId = readMfaTicket(ticket);
  if (!userId) throw new AppError("unauthenticated", "The sign-in attempt expired. Start again.");
  if (await isLimited(RULES.totpFailuresPerUser, userId)) {
    throw new AppError("rate_limited", "Too many wrong codes. Try again later.");
  }
  const [user] = await db().select().from(users).where(eq(users.id, userId)).limit(1);
  const method = user ? await checkSecondFactor(user, code) : null;
  if (!user || !method) {
    await hit(RULES.totpFailuresPerUser, userId);
    await audit({ userId: user?.id ?? null, action: "login_failed", summary: { step: "2fa" } });
    throw new AppError("unauthenticated", "That code is not valid.");
  }
  return startSession(
    user.id,
    user.email,
    headers,
    method === "totp" ? "password+totp" : "password+recovery",
  );
}

// ---------------------------------------------------------------- two-factor setup

/** Starts setup: a new secret is stored (encrypted) as pending until a code confirms it. */
export async function beginTotpSetup(userId: string, email: string) {
  const secret = generateSecret();
  await db()
    .update(users)
    .set({ totpPendingSecret: encryptSecret(secret), updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { secret, uri: otpauthUri(secret, email, "Personal site") };
}

/**
 * Turns 2FA on once a code from the app proves the secret was saved. Returns
 * the recovery codes (shown once). Other sessions, which never passed 2FA, are
 * signed out.
 */
export async function confirmTotpSetup(userId: string, sessionId: string, input: unknown) {
  const { code } = z.object({ code: z.string().trim() }).parse(input);
  await enforce(RULES.totpFailuresPerUser, `setup:${userId}`);
  const [user] = await db().select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.totpPendingSecret) {
    throw new AppError("validation_failed", "Start the setup again.");
  }
  const secret = decryptSecret(user.totpPendingSecret);
  const step = matchingStep(secret, code);
  if (step === null) {
    throw new AppError("validation_failed", undefined, {
      code: "That code is not valid. Check the time on your phone.",
    });
  }
  const recoveryCodes = generateRecoveryCodes();
  await db()
    .update(users)
    .set({
      totpSecret: user.totpPendingSecret,
      totpPendingSecret: null,
      totpEnabledAt: new Date(),
      totpLastStep: step,
      recoveryCodes: recoveryCodes.map(hashRecoveryCode),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await revokeOtherSessions(userId, sessionId);
  await audit({ userId, action: "totp_enabled" });
  return { recoveryCodes };
}

/** Turns 2FA off. Needs the password and a current (or recovery) code. */
export async function disableTotp(userId: string, input: unknown) {
  const { password, code } = z
    .object({
      password: z.string().min(1).max(PASSWORD_MAX),
      code: z.string().trim().min(6).max(20),
    })
    .parse(input);
  await enforce(RULES.totpFailuresPerUser, `disable:${userId}`);
  const [user] = await db().select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.totpEnabledAt)
    throw new AppError("validation_failed", "Two-factor authentication is not on.");
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("validation_failed", undefined, { password: "The password is incorrect." });
  }
  if (!(await checkSecondFactor(user, code))) {
    throw new AppError("validation_failed", undefined, { code: "That code is not valid." });
  }
  await db()
    .update(users)
    .set({ ...TOTP_OFF, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await audit({ userId, action: "totp_disabled" });
}

const TOTP_OFF = {
  totpSecret: null,
  totpPendingSecret: null,
  totpEnabledAt: null,
  totpLastStep: null,
  recoveryCodes: [] as string[],
};

export async function twoFactorStatus(userId: string) {
  const [user] = await db()
    .select({ enabledAt: users.totpEnabledAt, recoveryCodes: users.recoveryCodes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { enabledAt: user?.enabledAt ?? null, recoveryCodesLeft: user?.recoveryCodes.length ?? 0 };
}

const SIGN_IN_ACTIONS = [
  "login",
  "login_failed",
  "logout",
  "password_change",
  "password_reset_cli",
  "totp_enabled",
  "totp_disabled",
  "sign_out_others",
];

/** Recent account-security events for the Account page. */
export async function recentSignInActivity(userId: string, limit = 20) {
  return db()
    .select({ action: auditLog.action, summary: auditLog.summary, createdAt: auditLog.createdAt })
    .from(auditLog)
    .where(and(eq(auditLog.userId, userId), inArray(auditLog.action, SIGN_IN_ACTIONS)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: z.string().max(PASSWORD_MAX),
});

/** Changes the password and signs out every other session. */
export async function changePassword(
  userId: string,
  sessionId: string,
  input: unknown,
  headers: Headers,
) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(input);
  // Limits guessing the current password from a hijacked session.
  await enforce(RULES.loginFailuresPerAccount, keyedHash("password-change", userId));
  const [user] = await db().select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError("validation_failed", undefined, {
      currentPassword: "The current password is incorrect.",
    });
  }
  const problem = passwordProblem(newPassword, user.email);
  if (problem) throw new AppError("validation_failed", undefined, { newPassword: problem });

  const passwordHash = await hashPassword(newPassword);
  // passwordChangedAt invalidates older sessions; the current one is renewed below.
  await db()
    .update(users)
    .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await revokeOtherSessions(userId, null);
  const session = await createSession(userId, {
    ipHash: clientIpHash(headers),
    userAgent: headers.get("user-agent"),
  });
  await audit({
    userId,
    action: "password_change",
    summary: { previousSession: sessionId.slice(0, 8) },
  });
  return session;
}

/** Creates or resets the owner account. Used by the command-line scripts only. */
export async function upsertOwner(
  emailInput: string,
  password: string,
): Promise<"created" | "updated"> {
  const email = z.string().trim().toLowerCase().email().parse(emailInput);
  const problem = passwordProblem(password, email);
  if (problem) throw new Error(problem);
  const passwordHash = await hashPassword(password);
  const [existing] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    await db()
      .update(users)
      // Also turns two-factor authentication off: this is the recovery path for a
      // lost phone, and it needs access to the server.
      .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date(), ...TOTP_OFF })
      .where(eq(users.id, existing.id));
    await revokeOtherSessions(existing.id, null);
    await audit({ userId: existing.id, action: "password_reset_cli" });
    return "updated";
  }
  const [created] = await db()
    .insert(users)
    .values({ email, passwordHash, role: "owner" })
    .returning({ id: users.id });
  await audit({ userId: created!.id, action: "owner_created_cli" });
  return "created";
}
