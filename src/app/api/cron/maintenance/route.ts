import { env } from "@/server/env";
import { AppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { logger } from "@/server/logger";
import { safeEqual } from "@/server/security/crypto";
import { runMaintenance } from "@/server/services/maintenance";

/**
 * Data retention for serverless hosts, where the in-process hourly timer
 * cannot run. Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`;
 * without CRON_SECRET the route is disabled. Safe to run late, twice or not at
 * all: sessions and rate limits are checked by time on every request, this
 * only deletes rows that no longer matter.
 */
export const GET = apiHandler(async ({ request }) => {
  const secret = env().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) throw new AppError("unauthenticated");
  const removed = await runMaintenance();
  logger.info({ removed }, "maintenance finished");
  return Response.json({ removed });
});
