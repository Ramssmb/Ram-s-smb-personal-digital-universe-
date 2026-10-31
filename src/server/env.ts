import "server-only";

import { z } from "zod";

/**
 * Server configuration, validated once on first use.
 *
 * Parsing is lazy so `next build` can compile route modules without a database
 * URL; the first request (or script) that needs configuration fails loudly with
 * every invalid variable listed. Nothing here is ever sent to the browser: no
 * variable uses the NEXT_PUBLIC_ prefix.
 */
const postgresUrl = z
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), "must be a postgres:// URL");

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: postgresUrl,
  SITE_URL: z
    .url()
    .refine((value) => /^https?:\/\//.test(value), "must be an http(s) URL")
    .transform((value) => value.replace(/\/+$/, "")),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  /**
   * Server-side secret (≥ 32 random characters). Keys for IP hashing and form
   * signing are derived from it. Rotating it logs nobody out but resets rate
   * limit buckets. Generate with: node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
   */
  APP_SECRET: z.string().min(32, "must be at least 32 characters"),
  /** Directory for uploaded files. Public and private files live in separate subfolders. */
  STORAGE_DIR: z.string().min(1).default("./storage"),
  /**
   * Number of trusted reverse proxies in front of the app (e.g. 1 behind Caddy).
   * 0 ignores X-Forwarded-For entirely, so clients cannot spoof their address.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid server configuration:\n  - ${issues.join("\n  - ")}`);
    this.name = "ConfigError";
  }
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Report variable names and reasons only, never the values (they may be secrets).
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
