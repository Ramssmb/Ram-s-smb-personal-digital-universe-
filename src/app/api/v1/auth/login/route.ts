import { sessionCookie } from "@/server/auth/session";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { assertSameOrigin } from "@/server/security/origin";
import { login } from "@/server/services/auth";

/** Password step. With 2FA on, it returns a short-lived ticket for /auth/totp instead of a session. */
export const POST = apiHandler(async ({ request }) => {
  assertSameOrigin(request);
  const result = await login(await readJson(request), request.headers);
  if (result.mfaRequired) {
    return Response.json({ mfaRequired: true, ticket: result.ticket });
  }
  return Response.json(
    { user: result.user },
    { headers: { "set-cookie": sessionCookie(result.token, result.expiresAt) } },
  );
});
