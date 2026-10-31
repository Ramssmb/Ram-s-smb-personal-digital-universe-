import "server-only";

import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP's minimum recommended parameters (docs/AUTH_AND_SECURITY.md §2).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

// A small built-in list; length and the rate limiter do most of the work.
const COMMON = new Set([
  "password1234",
  "password12345",
  "123456789012",
  "qwertyuiop12",
  "administrator",
  "letmein12345",
  "welcome12345",
  "iloveyou1234",
  "changeme1234",
  "passwordpassword",
]);

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (COMMON.has(password.toLowerCase())) return "This password is too common.";
  if (email && password.toLowerCase().includes(email.split("@")[0]!.toLowerCase())) {
    return "Do not include your email name in the password.";
  }
  if (new Set(password).size < 5) return "Use a less repetitive password.";
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS); // @node-rs/argon2 defaults to Argon2id
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

// Verifying against this keeps the response time equal when the account does not exist.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("timing-equalizer-not-a-real-password");
  await verifyPassword(await dummyHash, password);
}
