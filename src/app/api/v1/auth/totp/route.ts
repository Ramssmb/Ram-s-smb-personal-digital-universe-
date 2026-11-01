import { sessionCookie } from "@/server/auth/session";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { assertSameOrigin } from "@/server/security/origin";
import { completeSecondFactor } from "@/server/services/auth";

/** Second sign-in step: the ticket from /auth/login plus an authenticator or recovery code. */
export const POST = apiHandler(async ({ request }) => {
  assertSameOrigin(request);
  const result = await completeSecondFactor(await readJson(request), request.headers);
  return Response.json(
    { user: result.user },
    { headers: { "set-cookie": sessionCookie(result.token, result.expiresAt) } },
  );
});
