/**
 * HTTP security headers (docs/AUTH_AND_SECURITY.md §5–6).
 *
 * Static headers are attached to every response by next.config.ts. The Content
 * Security Policy needs a fresh nonce per request, so src/proxy.ts sets it.
 */

export function staticSecurityHeaders(production: boolean): { key: string; value: string }[] {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()",
    },
  ];
  if (production) {
    // Two years. `preload` is added only once the final domain is stable (Phase 10).
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * The object-storage origin the browser may send files to, when direct uploads
 * are on (UPLOAD_MODE=direct); otherwise null. Read from the raw environment
 * because the proxy runs before (and without) full configuration validation.
 */
export function directUploadOrigin(
  source: Record<string, string | undefined> = process.env,
): string | null {
  if (source.UPLOAD_MODE !== "direct" || !source.S3_ENDPOINT) return null;
  try {
    return new URL(source.S3_ENDPOINT).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(
  nonce: string,
  development: boolean,
  uploadOrigin: string | null = null,
): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets nonce-approved Next.js scripts load their chunks.
    // React's development build needs eval for stack reconstruction only.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    // next/font and React inject style attributes; styles cannot run script.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...(uploadOrigin ? [uploadOrigin] : []),
      ...(development ? ["ws:"] : []),
    ],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(development ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}
