# Authentication, authorization and security

> Status: **Phase 2 — Design.** Every control listed here gets an automated test
> in Phase 9; the test file is named next to each control once implemented.

## 1. Threat model (short)

| Asset                                  | Threat                                                  | Primary controls                                                                                                  |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Admin account                          | Password guessing, credential stuffing                  | Argon2id, per-IP + per-account rate limits, optional TOTP, no user enumeration                                    |
| Admin session                          | Theft via XSS, CSRF, fixation                           | `httpOnly` cookie, strict CSP, sanitized Markdown, `Origin` check, new token on login                             |
| Unpublished / private content          | Leakage through pages, API, search, sitemap, media URLs | One visibility rule in the service layer; private media served only via authenticated route; 404 for hidden items |
| Contact recipient email, personal data | Scraping, accidental exposure                           | Recipient address server-only; public email strictly opt-in                                                       |
| Server                                 | Malicious uploads, SSRF, injection                      | Content-signature checks, re-encoding, parameterized queries, no server-side URL fetching                         |
| Availability                           | Spam floods, expensive searches                         | Rate limits, request size limits, query limits                                                                    |

## 2. Authentication

**Account creation.** `npm run admin:create` prompts for email and password on
the server. There is no registration route. `npm run admin:reset-password`
recovers a lost password and revokes every session.

**Passwords.** Argon2id (`@node-rs/argon2`) with memory 19 MiB, iterations 2,
parallelism 1 (OWASP minimum), re-hashed on login if parameters change. Minimum
12 characters, checked against a bundled list of common passwords. Maximum 256
characters to bound hashing cost.

**Login flow.**

1. Rate-limit check: 5 attempts / 15 min per IP, 10 / hour per account.
2. Look up user; if missing, verify against a dummy hash anyway (equal timing).
3. Same response for "no such user" and "wrong password".
4. On success: create a new session (never reuse a pre-login token), set cookie,
   record `audit_log`.
5. If TOTP is enabled, **no session is created yet**: the password step returns
   a signed, 5-minute sign-in ticket, and `/auth/totp` creates the session only
   after a valid 6-digit code or recovery code (5 wrong codes per 15 minutes
   per account, then locked). See §16.

**Session cookie.** Name `__Host-session` (forces `Secure`, `Path=/`, no
`Domain`). `HttpOnly`, `SameSite=Lax`. Value: 32 random bytes, base64url. The
database stores `sha256(token)` only, so a database leak does not yield usable
sessions. Expiry: 7 days sliding, 30 days absolute; extended at most once per
hour to limit writes.

**Invalidation.** Logout, password change (all other sessions), "sign out
everywhere", and 2FA changes revoke sessions. Sessions created before
`password_changed_at` are rejected.

## 3. Authorization

- `requireAdmin(request)` loads the session, checks expiry, revocation, MFA state
  and `role = 'owner'`, and returns the user or throws `401`/`403`.
- It is called **at the top of every admin route handler and every admin page's
  server component**. Middleware redirects anonymous visitors to `/admin/login`
  for convenience only.
- Admin services also take the admin user as an argument, so a service cannot be
  called from a public page without one (enforced by types).
- Public services take `viewer = 'public'` and apply the visibility rule.
- A test enumerates every route under `/api/v1/admin` from the file system and
  asserts each returns `401` without a session, so a newly added unprotected
  route fails CI.

## 4. CSRF

State-changing requests require: a valid session cookie (`SameSite=Lax` stops
cross-site `POST` cookies in modern browsers) **and** an `Origin` header matching
`SITE_URL` (rejects the remaining cases, including older browsers and
same-site subdomain attacks). `GET` handlers never change state.

## 5. XSS

- React escapes all interpolated text.
- Markdown is rendered on the server with `rehype-sanitize` (GitHub schema,
  raw HTML removed, `javascript:` and `data:` links removed).
- `dangerouslySetInnerHTML` is used only for sanitizer output and JSON-LD
  (serialized with `<` escaped).
- **Content Security Policy** with per-request nonces:
  `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: <media origin>; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`.

## 6. Other HTTP headers

`Strict-Transport-Security: max-age=63072000; includeSubDomains` (preload once
the domain is stable), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` denying camera, microphone, geolocation and similar,
`Cross-Origin-Opener-Policy: same-origin`. The `X-Powered-By` header is disabled.

## 7. Injection

All queries go through Drizzle's parameterized builder. Raw SQL (search) uses
the `sql` template tag, which parameterizes values. User search text goes through
`websearch_to_tsquery`, which cannot raise syntax errors. Sort and filter
parameters are validated against allow-lists, never interpolated.

## 8. Uploads

| Rule                           | Value                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed types (by magic bytes) | JPEG, PNG, WebP, AVIF, PDF                                                                                                                           |
| Rejected                       | SVG (can carry scripts), HTML, anything else                                                                                                         |
| Max size                       | Images 10 MB, PDFs 15 MB; request body capped before parsing                                                                                         |
| Image handling                 | Decoded and re-encoded by `sharp` (removes EXIF/GPS and any appended payload); pixel limit 40 MP to stop decompression bombs                         |
| PDF handling                   | Signature and structure checked; served with `Content-Disposition: attachment` unless the owner marks it viewable; `X-Content-Type-Options: nosniff` |
| Names                          | Random storage key; the original filename is never part of a path                                                                                    |
| Private files                  | Separate directory / bucket prefix with no public route; streamed only by `/admin/media/:id/file` after `requireAdmin`                               |

## 9. Outbound links

Every external URL is validated on write (`http`/`https` only, no embedded
credentials). Rendered links to other origins get
`rel="noopener noreferrer"` and `target="_blank"` only when the owner chooses;
links in Markdown get `rel="nofollow ugc noopener noreferrer"`.

## 10. Contact form

- Server-side Zod validation; length limits; email syntax check.
- Hidden honeypot field; submissions faster than 3 s after page render are
  flagged (signed timestamp in a hidden field).
- Rate limit: 3 per 10 min and 10 per day per IP.
- Optional Cloudflare Turnstile, off by default (privacy and a third-party
  script); can be switched on from settings if spam appears.
- Messages stored first, then an email notification is sent if SMTP is
  configured; a mail failure never loses a message or shows an error to the
  visitor. Spam never triggers an email. The visitor's address is only used as
  Reply-To, and the subject is reduced to one line (no header injection).
- Retention: messages flagged as spam are deleted after 30 days; other
  messages are kept until the owner deletes them.

## 11. Secrets and configuration

- All secrets come from environment variables validated at startup.
- None are prefixed `NEXT_PUBLIC_`; a CI check fails the build if the client
  bundle contains a known secret variable name or value pattern.
- `.env*` files are git-ignored except `.env.example`.
- Secrets as built: `DATABASE_URL` (and the migration URL), `APP_SECRET`
  (one 32+ character secret; purpose-specific keys are derived from it with
  HKDF / keyed hashes), and optionally `SMTP_URL` and `S3_SECRET_ACCESS_KEY`.
  Startup errors name missing variables, never their values.

## 12. Logging and errors

Structured JSON logs with a request id. Logged: method, path, status, duration,
user id for admin requests. **Never logged:** passwords, cookies, tokens, full
request bodies, contact message bodies, SQL query parameters. Unexpected errors
are logged with the same request id; no external error-monitoring service is
connected (DEPLOYMENT.md §10).

## 13. Privacy

- Raw visitor IPs are never stored; a keyed hash is used for rate limits and
  spam detection.
- No third-party analytics by default. If enabled later, a cookieless option
  (e.g. self-hosted Plausible/Umami) is preferred so no consent banner is needed.
- Location and personal email appear only if the owner explicitly fills them in
  and publishes them.

## 14. Dependency audit policy

CI runs two audits on every push:

- **Production dependencies** (`npm audit --omit=dev`): any finding fails the build.
- **All dependencies**: fails only on critical findings; lower findings in
  development tools are reviewed and recorded here.

Accepted development-only findings (reviewed 2026-11-01):

| Advisory                                        | Where                                                                                          | Why it is accepted                                                                                                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHSA-g3hv-75wg-m249 (minimatch ReDoS, moderate) | minimatch 3.1.5 inside `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react` | No patched 3.x release exists. The linter only evaluates glob patterns written in this repository's config, never untrusted input. Copies of minimatch 10 are overridden to 11.0.1 in `package.json`. |
| esbuild ≤ 0.24.2 dev-server CORS (moderate)     | `drizzle-kit` → `@esbuild-kit/*`                                                               | The advisory concerns esbuild's development _server_; drizzle-kit only uses esbuild to load its config file and never starts that server.                                                             |

Re-check both whenever ESLint or drizzle-kit is upgraded.

## 15. As built (v0.4.0)

Implemented and covered by tests (`tests/integration/*`, `tests/e2e/*`):
everything in §2–§13 except the items below.

- **Not implemented:** optional Cloudflare Turnstile; error-monitoring service
  (needs the owner's approval of a provider).
- **Production configuration is checked at startup:** `SITE_URL` must be https
  (localhost excepted, for smoke tests); S3 and SMTP settings must be complete
  if used.
- **Retention (hourly job):** expired sessions and rate-limit rows, audit log
  entries older than 365 days, spam older than 30 days.
- **Session cookie name:** `__Host-session` when `SITE_URL` is https, `session`
  on plain-http development (browsers refuse `__Host-` cookies without HTTPS).
- **Client IP:** taken from `X-Forwarded-For` only when `TRUST_PROXY_HOPS` > 0;
  Caddy overwrites that header with the real address. Without a proxy every
  client shares one rate-limit bucket.
- **Login rate limits** count failed attempts only (5 per 15 minutes per
  address, 10 per hour per account).
- **Every admin API route** is discovered from the file system by
  `tests/integration/authorization.test.ts`, which proves 401 without a session
  and 403 for cross-site writes on every exported method.

## 16. Two-factor authentication (TOTP)

- Turned on from Admin → Account: enter the setup key (or open the `otpauth://`
  link) in any authenticator app, confirm with a code. Confirming signs out
  every other session and shows **10 recovery codes once**.
- Standard RFC 6238 (SHA-1, 6 digits, 30 s, ±1 step for clock drift),
  implemented with Node's `crypto`; verified against the RFC test vectors.
- The secret is stored encrypted (AES-256-GCM, key derived from `APP_SECRET`);
  recovery codes are stored as SHA-256 hashes and each works once. A code is
  rejected if its time step was already used (no replay).
- Turning it off needs the password **and** a code.
- Lost phone and recovery codes: on the server, `npm run admin:create` with the
  owner's email resets the password and turns 2FA off (requires server access).
- If `APP_SECRET` changes, app codes stop working (logged as a warning);
  recovery codes still do.
- Sign-ins, failed passwords and codes, and 2FA changes are written to the audit log;
  Admin → Account shows recent sign-in activity, and "Sign out all other sessions"
  revokes every other session.
