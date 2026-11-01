/**
 * Runs the data-retention job once (the app also runs it hourly by itself):
 *
 *   npm run maintenance
 */
import { sqlClient } from "../src/server/db/client";
import { runMaintenance } from "../src/server/services/maintenance";

try {
  const removed = await runMaintenance();
  console.log(`Maintenance finished: ${JSON.stringify(removed)}`);
} catch (error) {
  console.error("Maintenance failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sqlClient().end();
}
