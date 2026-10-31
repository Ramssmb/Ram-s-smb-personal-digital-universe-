import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { AppError } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/security/origin";

import { sessionCookieName, validateSession, type SessionUser } from "./session";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

/**
 * Authorization for admin API handlers. Checks the session, the role and —
 * for state-changing methods — the request Origin. Call it first in every
 * handler under /api/v1/admin (a test enforces this).
 */
export async function requireAdmin(request: Request): Promise<SessionUser> {
  const user = await validateSession(
    readCookie(request.headers.get("cookie"), sessionCookieName()),
  );
  if (!user) throw new AppError("unauthenticated");
  if (user.role !== "owner") throw new AppError("forbidden");
  assertSameOrigin(request);
  return user;
}

/** The current admin for server components, or null. Cached per request. */
export const currentAdmin = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const user = await validateSession(store.get(sessionCookieName())?.value);
  return user && user.role === "owner" ? user : null;
});

/** For admin pages: redirects to the sign-in page when there is no admin session. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
