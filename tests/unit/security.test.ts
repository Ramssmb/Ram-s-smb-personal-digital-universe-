import { safeExternalUrl, safeMailto } from "@/lib/safe-url";
import {
  contentSecurityPolicy,
  createNonce,
  directUploadOrigin,
  staticSecurityHeaders,
} from "@/server/security/headers";
import { parseServerEnv } from "@/server/env";
import { allowedOrigins } from "@/server/security/origin";

describe("contentSecurityPolicy", () => {
  const production = contentSecurityPolicy("abc123", false);

  it("allows scripts only from self and the request nonce", () => {
    expect(production).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(production).not.toContain("unsafe-eval");
    expect(production).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("blocks plugins, framing and base-tag hijacking", () => {
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("base-uri 'none'");
    expect(production).toContain("form-action 'self'");
  });

  it("relaxes only what the development server needs", () => {
    const development = contentSecurityPolicy("abc123", true);
    expect(development).toContain("'unsafe-eval'");
    expect(development).not.toContain("upgrade-insecure-requests");
  });

  it("lets the browser reach object storage only when direct uploads are on", () => {
    expect(production).toContain("connect-src 'self';");
    expect(directUploadOrigin({ S3_ENDPOINT: "https://s3.example.test/x" })).toBeNull();
    const origin = directUploadOrigin({
      UPLOAD_MODE: "direct",
      S3_ENDPOINT: "https://s3.example.test/x",
    });
    expect(origin).toBe("https://s3.example.test");
    expect(contentSecurityPolicy("abc123", false, origin)).toContain(
      "connect-src 'self' https://s3.example.test;",
    );
  });
});

describe("allowedOrigins", () => {
  const base = {
    DATABASE_URL: "postgres://a:b@127.0.0.1/db",
    SITE_URL: "https://ramsdevspace.com",
    APP_SECRET: "x".repeat(32),
    VERCEL_URL: "site-abc123.vercel.app",
    VERCEL_BRANCH_URL: "site-git-main.vercel.app",
  };

  it("accepts only the site origin in production", () => {
    expect(allowedOrigins(parseServerEnv({ ...base, VERCEL_ENV: "production" }))).toEqual([
      "https://ramsdevspace.com",
    ]);
    expect(allowedOrigins(parseServerEnv({ ...base, VERCEL_URL: undefined }))).toEqual([
      "https://ramsdevspace.com",
    ]);
  });

  it("adds a preview deployment's own URLs on previews only", () => {
    expect(allowedOrigins(parseServerEnv({ ...base, VERCEL_ENV: "preview" }))).toEqual([
      "https://ramsdevspace.com",
      "https://site-abc123.vercel.app",
      "https://site-git-main.vercel.app",
    ]);
  });
});

describe("createNonce", () => {
  it("returns a fresh 128-bit base64 value each time", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(atob(a)).toHaveLength(16);
  });
});

describe("staticSecurityHeaders", () => {
  const names = (production: boolean) => staticSecurityHeaders(production).map((h) => h.key);

  it("always sends the baseline headers", () => {
    expect(names(false)).toEqual(
      expect.arrayContaining([
        "X-Content-Type-Options",
        "Referrer-Policy",
        "X-Frame-Options",
        "Permissions-Policy",
        "Cross-Origin-Opener-Policy",
      ]),
    );
  });

  it("sends HSTS only in production (it would break plain-http local development)", () => {
    expect(names(false)).not.toContain("Strict-Transport-Security");
    expect(names(true)).toContain("Strict-Transport-Security");
  });
});

describe("safeExternalUrl", () => {
  it.each(["https://github.com/someone", "http://example.test/path?q=1"])("accepts %s", (url) => {
    expect(safeExternalUrl(url)).toBe(new URL(url).toString());
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "/relative/path",
    "//evil.test",
    "https://user:pass@example.test",
    "not a url",
    "",
    null,
    undefined,
  ])("rejects %j", (url) => {
    expect(safeExternalUrl(url)).toBeNull();
  });
});

describe("safeMailto", () => {
  it("accepts a plain address and normalizes case", () => {
    expect(safeMailto("mailto:Me@Example.test")).toBe("mailto:me@example.test");
  });

  it.each([
    "mailto:me@example.test?cc=boss@example.test",
    "mailto:me@example.test?body=hi",
    "mailto:me@example.test&cc=x@y.z",
    "mailto:not-an-address",
    "mailto:a@b",
    "mailto:me@example.test, other@example.test",
    "javascript:alert(1)//mailto:me@example.test",
    "me@example.test",
  ])("rejects %j", (value) => {
    expect(safeMailto(value)).toBeNull();
  });
});
