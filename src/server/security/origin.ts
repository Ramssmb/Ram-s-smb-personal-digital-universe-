import "server-only";

import { env, type ServerEnv } from "@/server/env";
import { AppError } from "@/server/http/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Origins allowed to make state-changing requests: the site itself and, on a
 * Vercel preview deployment only, that deployment's own URLs (each preview
 * has its own host name, so a single SITE_URL cannot match them all).
 */
export function allowedOrigins(config: ServerEnv = env()): string[] {
  const origins = [new URL(config.SITE_URL).origin];
  if (config.VERCEL_ENV === "preview") {
    for (const host of [config.VERCEL_URL, config.VERCEL_BRANCH_URL]) {
      if (host) origins.push(`https://${host}`);
    }
  }
  return origins;
}

/**
 * CSRF defence for state-changing requests (docs/AUTH_AND_SECURITY.md §4): the
 * Origin header must equal the site origin. Browsers always send Origin on
 * cross-site and same-origin POST/PATCH/DELETE requests made with fetch or forms.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) {
    throw new AppError("csrf_rejected");
  }
}
