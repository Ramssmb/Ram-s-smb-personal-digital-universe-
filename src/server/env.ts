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
  /** Development aid: serves the component gallery at /admin/design. Off by default. */
  DESIGN_GALLERY: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
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
