# Authentication, authorization and security

> Status: **Phase 2 — Design.** Every control listed here gets an automated test
> in Phase 9; the test file is named next to each control once implemented.

## 1. Threat model (short)

| Asset | Threat | Primary controls |
|-------|--------|------------------|
| Admin account | Password guessing, credential stuffing | Argon2id, per-IP + per-account rate limits, optional TOTP, no user enumeration |
| Admin session | Theft via XSS, CSRF, fixation | `httpOnly` cookie, strict CSP, sanitized Markdown, `Origin` check, new token on login |
| Unpublished / private content | Leakage through pages, API, search, sitemap, media URLs | One visibility rule in the service layer; private media served only via authenticated route; 404 for hidden items |
| Contact recipient email, personal data | Scraping, accidental exposure | Recipient address server-only; public email strictly opt-in |
| Server | Malicious uploads, SSRF, injection | Content-signature checks, re-encoding, parameterized queries, no server-side URL fetching |
| Availability | Spam floods, expensive searches | Rate limits, request size limits, query limits |

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
5. If TOTP is enabled, the session is created with `mfa_verified = false` and
   can only call `/auth/totp` until verified (5 attempts, then the session is
   revoked).

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

| Rule | Value |
|------|-------|
| Allowed types (by magic bytes) | JPEG, PNG, WebP, AVIF, PDF |
| Rejected | SVG (can carry scripts), HTML, anything else |
| Max size | Images 10 MB, PDFs 15 MB; request body capped before parsing |
| Image handling | Decoded and re-encoded by `sharp` (removes EXIF/GPS and any appended payload); pixel limit 40 MP to stop decompression bombs |
| PDF handling | Signature and structure checked; served with `Content-Disposition: attachment` unless the owner marks it viewable; `X-Content-Type-Options: nosniff` |
| Names | Random storage key; the original filename is never part of a path |
| Private files | Separate directory / bucket prefix with no public route; streamed only by `/admin/media/:id/file` after `requireAdmin` |

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
- Messages stored first, then an email notification is sent; a mail failure
  never loses a message.

## 11. Secrets and configuration

- All secrets come from environment variables validated at startup.
- None are prefixed `NEXT_PUBLIC_`; a CI check fails the build if the client
  bundle contains a known secret variable name or value pattern.
- `.env*` files are git-ignored except `.env.example`.
- Required secrets: `DATABASE_URL`, `SESSION_IP_HASH_KEY`, `TOTP_ENCRYPTION_KEY`,
  `PREVIEW_TOKEN_KEY`, SMTP credentials, storage credentials (S3 mode).

## 12. Logging and errors

Structured JSON logs with a request id. Logged: method, path, status, duration,
user id for admin requests. **Never logged:** passwords, cookies, tokens, full
request bodies, contact message bodies. Unexpected errors are reported to error
monitoring with the same request id and scrubbed of those fields.

## 13. Privacy

- Raw visitor IPs are never stored; a keyed hash is used for rate limits and
  spam detection.
- No third-party analytics by default. If enabled later, a cookieless option
  (e.g. self-hosted Plausible/Umami) is preferred so no consent banner is needed.
- Location and personal email appear only if the owner explicitly fills them in
  and publishes them.
