/**
 * Creates the owner account, or resets its password (and signs out every
 * session). There is no public registration page; this is the only way in.
 *
 *   npm run admin:create      prompts for email and password
 *
 * Non-interactive (CI, provisioning): set ADMIN_EMAIL and ADMIN_PASSWORD.
 */
import { ask, askHidden } from "./prompt";

const email = process.env.ADMIN_EMAIL ?? (await ask("Owner email: "));
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  if (!process.stdin.isTTY) {
    console.error("Run this in a terminal, or set ADMIN_EMAIL and ADMIN_PASSWORD.");
    process.exit(1);
  }
  try {
    password = await askHidden("Password (12+ characters): ");
  } catch {
    process.exit(130); // Ctrl-C
  }
  const again = await askHidden("Repeat password: ").catch(() => process.exit(130));
  if (password !== again) {
    console.error("The passwords do not match.");
    process.exit(1);
  }
}

// Imported after reading input so configuration errors show after the prompts are answered.
const { upsertOwner } = await import("../src/server/services/auth");
const { sqlClient } = await import("../src/server/db/client");
try {
  const result = await upsertOwner(email, password);
  console.log(
    result === "created" ? "Owner account created." : "Password reset; all sessions signed out.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sqlClient().end();
}
