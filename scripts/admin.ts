/**
 * Creates the owner account, or resets its password (and signs out every
 * session). There is no public registration page; this is the only way in.
 *
 *   npm run admin:create      prompts for email and password
 *
 * Non-interactive (CI, provisioning): set ADMIN_EMAIL and ADMIN_PASSWORD.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    // Mask typed characters.
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) =>
      write.call(rl, s.includes(question) ? s : s.replace(/[^\r\n]/g, "*"));
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer;
}

const email = process.env.ADMIN_EMAIL ?? (await ask("Owner email: "));
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await ask("Password (12+ characters): ", true);
  const again = await ask("Repeat password: ", true);
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
