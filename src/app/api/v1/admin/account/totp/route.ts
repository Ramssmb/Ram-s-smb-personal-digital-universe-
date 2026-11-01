import { requireAdmin } from "@/server/auth/guard";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { beginTotpSetup, disableTotp } from "@/server/services/auth";

/** Starts 2FA setup: returns the secret and otpauth:// link to add to an authenticator app. */
export const POST = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  return Response.json(await beginTotpSetup(admin.id, admin.email));
});

/** Turns 2FA off (needs the password and a current or recovery code). */
export const DELETE = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  await disableTotp(admin.id, await readJson(request));
  return new Response(null, { status: 204 });
});
