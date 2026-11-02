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

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: postgresUrl,
    SITE_URL: z
      .url()
      .refine((value) => /^https?:\/\//.test(value), "must be an http(s) URL")
      .transform((value) => value.replace(/\/+$/, "")),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
    /**
     * Named prepared statements. Set "false" behind a transaction-mode pooler
     * that rejects them; Neon's pooler accepts the protocol-level ones postgres.js uses.
     */
    DATABASE_PREPARE: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
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

    /** "local" (a directory, the default) or "s3" (any S3-compatible bucket). */
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    /** e.g. https://<account>.r2.cloudflarestorage.com or https://s3.eu-central-1.amazonaws.com */
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default("auto"),
    S3_BUCKET: z.string().min(3).max(63).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /**
     * "form" (default): files are posted to the app. "direct": the browser puts
     * the file straight into the bucket with a short-lived signed URL and the app
     * processes it from there — needed on hosts with a small request-body limit
     * (Vercel: 4.5 MB). Requires STORAGE_DRIVER=s3 and bucket CORS for SITE_URL.
     */
    UPLOAD_MODE: z.enum(["form", "direct"]).default("form"),

    /** Bearer token Vercel Cron sends to /api/cron/maintenance. Unset = route disabled. */
    CRON_SECRET: z.string().min(16, "must be at least 16 characters").optional(),
    /** Set by Vercel: "production", "preview" or "development". */
    VERCEL_ENV: z.string().optional(),
    /** Set by Vercel: this deployment's host name, without https://. */
    VERCEL_URL: z.string().optional(),
    /** Set by Vercel: the branch's stable preview host name, without https://. */
    VERCEL_BRANCH_URL: z.string().optional(),

    /**
     * Optional email notification for new contact messages, e.g.
     * smtps://user:password@smtp.example.com:465. Unset = notifications off.
     */
    SMTP_URL: z.string().optional(),
    /** Sender address, e.g. "Website <site@example.com>". */
    SMTP_FROM: z.string().max(200).optional(),
    /** Where notifications go. Never shown on the site. */
    CONTACT_NOTIFY_TO: z.email().optional(),
  })
  .superRefine((value, ctx) => {
    // Production must be served over HTTPS: the session cookie is only Secure /
    // __Host- on https. Plain http is allowed for localhost (CI, local checks).
    if (value.NODE_ENV === "production") {
      const url = new URL(value.SITE_URL);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (url.protocol !== "https:" && !local) {
        ctx.addIssue({
          code: "custom",
          path: ["SITE_URL"],
          message: "must use https:// in production",
        });
      }
    }
    if (value.STORAGE_DRIVER === "s3") {
      for (const key of [
        "S3_ENDPOINT",
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ] as const) {
        if (!value[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "is required when STORAGE_DRIVER=s3",
          });
      }
      if (
        value.S3_ENDPOINT &&
        !value.S3_ENDPOINT.startsWith("https://") &&
        value.NODE_ENV === "production"
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["S3_ENDPOINT"],
          message: "must use https:// in production",
        });
      }
    }
    if (value.UPLOAD_MODE === "direct" && value.STORAGE_DRIVER !== "s3") {
      ctx.addIssue({
        code: "custom",
        path: ["UPLOAD_MODE"],
        message: "direct uploads need STORAGE_DRIVER=s3",
      });
    }
    if (value.SMTP_URL) {
      if (!/^smtps?:\/\//.test(value.SMTP_URL)) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_URL"],
          message: "must start with smtp:// or smtps://",
        });
      }
      for (const key of ["SMTP_FROM", "CONTACT_NOTIFY_TO"] as const) {
        if (!value[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "is required when SMTP_URL is set",
          });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid server configuration:\n  - ${issues.join("\n  - ")}`);
    this.name = "ConfigError";
  }
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  // Docker Compose passes unset optional variables as "": treat those as not set.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ""),
  );
  const result = serverEnvSchema.safeParse(cleaned);
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
