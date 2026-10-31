import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  burnPasswordCheck,
  hashPassword,
  passwordProblem,
  PASSWORD_MAX,
  verifyPassword,
} from "@/server/auth/password";
import { createSession, revokeOtherSessions } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { clientIpHash } from "@/server/security/client-ip";
import { keyedHash } from "@/server/security/crypto";
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

  await db().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const session = await createSession(user.id, { ipHash, userAgent: headers.get("user-agent") });
  await audit({ userId: user.id, action: "login" });
  return { user: { id: user.id, email: user.email }, ...session };
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
      .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
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
