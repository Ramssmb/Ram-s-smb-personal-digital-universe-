import { sessionCookie } from "@/server/auth/session";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/body";
import { assertSameOrigin } from "@/server/security/origin";
import { login } from "@/server/services/auth";

export const POST = apiHandler(async ({ request }) => {
  assertSameOrigin(request);
  const result = await login(await readJson(request), request.headers);
  return Response.json(
    { user: result.user },
    { headers: { "set-cookie": sessionCookie(result.token, result.expiresAt) } },
  );
});
