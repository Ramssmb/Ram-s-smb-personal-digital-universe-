/**
 * Runs once when the server starts (Next.js instrumentation hook). Schedules
 * the hourly data-retention job in the Node.js runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { scheduleMaintenance } = await import("@/server/services/maintenance");
  scheduleMaintenance();
}
