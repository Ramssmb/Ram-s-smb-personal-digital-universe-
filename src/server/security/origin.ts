import "server-only";

import { env } from "@/server/env";
import { AppError } from "@/server/http/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for state-changing requests (docs/AUTH_AND_SECURITY.md §4): the
 * Origin header must equal the site origin. Browsers always send Origin on
 * cross-site and same-origin POST/PATCH/DELETE requests made with fetch or forms.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get("origin");
  const expected = new URL(env().SITE_URL).origin;
  if (!origin || origin !== expected) {
    throw new AppError("csrf_rejected");
  }
}
