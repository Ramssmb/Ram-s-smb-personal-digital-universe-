import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/server/db/client";
import { auditLog } from "@/server/db/schema";
import { logger } from "@/server/logger";

export interface AuditEntry {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  /** Field names and similar metadata only. Never values that could be secret. */
  summary?: Record<string, unknown>;
}

/** Records an admin action. A failure to audit is logged but never blocks the action. */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db().insert(auditLog).values(entry);
  } catch (error) {
    logger.error({ err: error, action: entry.action }, "audit write failed");
  }
}

export function recentAudit(limit = 20) {
  return db().select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}
