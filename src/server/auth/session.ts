import "server-only";

import { and, eq, gt, isNull, lt, ne } from "drizzle-orm";

import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { randomToken, sha256Hex } from "@/server/security/crypto";

const SLIDING_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/** `__Host-` forces Secure, Path=/ and no Domain; it needs HTTPS, so plain-http dev uses a plain name. */
export function sessionCookieName(): string {
  return env().SITE_URL.startsWith("https://") ? "__Host-session" : "session";
}

export function sessionCookie(token: string, expiresAt: Date): string {
  const secure = env().SITE_URL.startsWith("https://") ? "; Secure" : "";
  return `${sessionCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function clearedSessionCookie(): string {
  const secure = env().SITE_URL.startsWith("https://") ? "; Secure" : "";
  return `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export interface SessionUser {
  id: string;
  email: string;
  role: "owner" | "editor";
  sessionId: string;
}

export async function createSession(
  userId: string,
  meta: { ipHash: string; userAgent: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SLIDING_MS);
  await db()
    .insert(sessions)
    .values({
      id: sha256Hex(token),
      userId,
      expiresAt,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    });
  return { token, expiresAt };
}

/**
 * Resolves a cookie token to its user. Rejects expired, revoked, over-age
 * sessions and sessions created before the last password change.
 */
export async function validateSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const id = sha256Hex(token);
  const now = new Date();
  const [row] = await db()
    .select({
      sessionId: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      role: users.role,
      passwordChangedAt: users.passwordChangedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  if (now.getTime() - row.createdAt.getTime() > ABSOLUTE_MS) return null;
  if (row.createdAt < row.passwordChangedAt) return null;

  // Slide the expiry at most once an hour to limit writes.
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const capped = Math.min(now.getTime() + SLIDING_MS, row.createdAt.getTime() + ABSOLUTE_MS);
    await db()
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: new Date(capped) })
      .where(eq(sessions.id, id));
  }
  return { id: row.userId, email: row.email, role: row.role, sessionId: row.sessionId };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db().update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function revokeOtherSessions(
  userId: string,
  keepSessionId: string | null,
): Promise<number> {
  const rows = await db()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        keepSessionId ? ne(sessions.id, keepSessionId) : undefined,
      ),
    )
    .returning({ id: sessions.id });
  return rows.length;
}

export async function listActiveSessions(userId: string) {
  return db()
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .orderBy(sessions.lastSeenAt);
}

export async function pruneSessions(): Promise<void> {
  await db()
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date(Date.now() - ABSOLUTE_MS)));
}
