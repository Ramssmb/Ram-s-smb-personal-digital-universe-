import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/server/db/client";
import { AppError } from "@/server/http/errors";

export interface RateLimitRule {
  /** Bucket name, e.g. "login-ip". */
  name: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Fixed-window counter in PostgreSQL (ARCHITECTURE.md D11). One atomic upsert
 * per check, so concurrent requests and multiple app instances share the count.
 */
export async function hit(
  rule: RateLimitRule,
  subject: string,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const windowMs = rule.windowSeconds * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const key = `${rule.name}:${subject}`;
  const rows = await db().execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`);
  const count = Number(rows[0]?.count ?? 1);
  const retryAfter = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
  return { allowed: count <= rule.limit, retryAfter };
}

/** Counts a hit and throws 429 when the limit is exceeded. */
export async function enforce(rule: RateLimitRule, subject: string): Promise<void> {
  const { allowed, retryAfter } = await hit(rule, subject);
  if (!allowed) {
    throw new AppError("rate_limited", undefined, undefined, { "retry-after": String(retryAfter) });
  }
}

/** Reads the current count without incrementing it. */
export async function isLimited(rule: RateLimitRule, subject: string): Promise<boolean> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db().execute<{ count: number }>(sql`
    SELECT count FROM rate_limits
    WHERE key = ${`${rule.name}:${subject}`} AND window_start = ${windowStart.toISOString()}`);
  return Number(rows[0]?.count ?? 0) >= rule.limit;
}

/** Removes windows that ended more than a day ago. Called opportunistically. */
export async function pruneRateLimits(): Promise<void> {
  await db().execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
}

export const RULES = {
  loginFailuresPerIp: { name: "login-fail-ip", limit: 5, windowSeconds: 15 * 60 },
  loginFailuresPerAccount: { name: "login-fail-account", limit: 10, windowSeconds: 60 * 60 },
  contactPerIpShort: { name: "contact-ip-10m", limit: 3, windowSeconds: 10 * 60 },
  contactPerIpDay: { name: "contact-ip-day", limit: 10, windowSeconds: 24 * 60 * 60 },
  searchPerIp: { name: "search-ip", limit: 60, windowSeconds: 60 },
  uploadsPerUser: { name: "upload-user", limit: 120, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;
