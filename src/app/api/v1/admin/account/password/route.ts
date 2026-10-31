import { requireAdmin } from "@/server/auth/guard";
import { sessionCookie } from "@/server/auth/session";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { changePassword } from "@/server/services/auth";

/** Changes the password; every session is signed out and this browser gets a fresh one. */
export const POST = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  const session = await changePassword(
    admin.id,
    admin.sessionId,
    await readJson(request),
    request.headers,
  );
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) },
  });
});
