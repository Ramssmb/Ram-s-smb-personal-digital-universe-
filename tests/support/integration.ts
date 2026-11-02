import { randomUUID } from "node:crypto";

import postgres from "postgres";

import { createSession } from "@/server/auth/session";
import { upsertOwner } from "@/server/services/auth";

import { testDatabaseUrls } from "./db-urls";

export const SITE = "http://localhost:3000";
export const PASSWORD = "correct horse battery staple 42";

/** Direct connection as the schema owner, for setup and assertions only. */
export const ownerSql = postgres(testDatabaseUrls().owner, { max: 1, onnotice: () => {} });

const TABLES = [
  "rate_limits",
  "audit_log",
  "sessions",
  "upload_intents",
  "users",
  "contact_messages",
  "project_skills",
  "project_tags",
  "project_media",
  "experience_skills",
  "certification_skills",
  "journal_tags",
  "journal_skills",
  "journal_media",
  "resource_tags",
  "projects",
  "experiences",
  "certifications",
  "achievements",
  "journal_entries",
  "resources",
  "links",
  "skills",
  "education",
  "about_sections",
  "categories",
  "tags",
  "seo_pages",
  "profile",
  "site_settings",
  "media_assets",
];

export async function resetDatabase(): Promise<void> {
  await ownerSql.unsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

/** A unique client address, so rate-limit buckets never leak between tests. */
export function uniqueIp(): string {
  const n = Math.floor(Math.random() * 250) + 1;
  return `10.${n}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
}

export interface Admin {
  id: string;
  email: string;
  cookie: string;
}

export async function createAdmin(
  email = `owner-${randomUUID().slice(0, 8)}@example.test`,
): Promise<Admin> {
  await upsertOwner(email, PASSWORD);
  const [user] = await ownerSql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`;
  const { token } = await createSession(user!.id, { ipHash: "test", userAgent: "vitest" });
  return { id: user!.id, email, cookie: `session=${token}` };
}

export interface RequestOptions {
  json?: unknown;
  body?: BodyInit;
  cookie?: string;
  origin?: string | null;
  ip?: string;
  headers?: Record<string, string>;
}

/** Builds a Request like a same-origin browser would send it. */
export function request(method: string, path: string, options: RequestOptions = {}): Request {
  const headers = new Headers(options.headers);
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.origin !== null && method !== "GET") headers.set("origin", options.origin ?? SITE);
  headers.set("x-forwarded-for", options.ip ?? uniqueIp());
  headers.set("user-agent", "vitest");
  let body = options.body;
  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.json);
  }
  return new Request(`${SITE}${path}`, { method, headers, body });
}

export function routeContext(params: Record<string, string | string[]> = {}) {
  return { params: Promise.resolve(params) };
}

/** Another session for an existing account (a second browser), without changing the account. */
export async function anotherSession(admin: Admin): Promise<string> {
  const { token } = await createSession(admin.id, { ipHash: "test", userAgent: "vitest-2" });
  return `session=${token}`;
}
