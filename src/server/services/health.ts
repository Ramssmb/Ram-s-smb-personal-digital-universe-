import "server-only";

import { sqlClient } from "@/server/db/client";
import { logger } from "@/server/logger";

const DB_TIMEOUT_MS = 2_000;

/** True when the database answers a trivial query within the timeout. */
export async function databaseReachable(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("database health check timed out")), DB_TIMEOUT_MS);
    });
    await Promise.race([sqlClient()`select 1`, timeout]);
    return true;
  } catch (error) {
    logger.warn({ err: error }, "database health check failed");
    return false;
  } finally {
    clearTimeout(timer);
  }
}
