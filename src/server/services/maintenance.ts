import "server-only";

import { and, eq, lt } from "drizzle-orm";

import { pruneSessions } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { auditLog, contactMessages } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { pruneRateLimits } from "@/server/security/rate-limit";

const DAY = 24 * 60 * 60 * 1000;
export const RETENTION = {
  auditLogDays: 365,
  spamMessageDays: 30,
} as const;

/**
 * Removes data that is no longer needed, so tables do not grow without bound:
 * finished rate-limit windows, sessions past their absolute lifetime, audit
 * entries older than a year and messages marked as spam more than 30 days ago.
 * Real messages (new, read, archived) are kept until the owner deletes them.
 */
export async function runMaintenance(now = new Date()): Promise<{
  auditLog: number;
  spam: number;
}> {
  await pruneRateLimits();
  await pruneSessions();
  const audits = await db()
    .delete(auditLog)
    .where(lt(auditLog.createdAt, new Date(now.getTime() - RETENTION.auditLogDays * DAY)))
    .returning({ id: auditLog.id });
  const spam = await db()
    .delete(contactMessages)
    .where(
      and(
        eq(contactMessages.status, "spam"),
        lt(contactMessages.createdAt, new Date(now.getTime() - RETENTION.spamMessageDays * DAY)),
      ),
    )
    .returning({ id: contactMessages.id });
  return { auditLog: audits.length, spam: spam.length };
}

/** Runs maintenance now and then hourly in this process. Errors are logged, never thrown. */
export function scheduleMaintenance(intervalMs = 60 * 60 * 1000): void {
  const run = () =>
    runMaintenance()
      .then((removed) => logger.info({ removed }, "maintenance finished"))
      .catch((error: unknown) => logger.error({ err: error }, "maintenance failed"));
  setTimeout(run, 30_000).unref();
  setInterval(run, intervalMs).unref();
}
