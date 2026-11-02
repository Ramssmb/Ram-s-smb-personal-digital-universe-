/**
 * Runs once when the server starts (Next.js instrumentation hook). Schedules
 * the hourly data-retention job in the Node.js runtime only. On Vercel the
 * process does not live between requests, so Vercel Cron calls
 * /api/cron/maintenance instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL) return;
  const { scheduleMaintenance } = await import("@/server/services/maintenance");
  scheduleMaintenance();
}
