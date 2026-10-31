import { requireAdmin } from "@/server/auth/guard";
import { clearedSessionCookie, revokeSession } from "@/server/auth/session";
import { apiHandler } from "@/server/http/handler";
import { audit } from "@/server/services/audit";

export const POST = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  await revokeSession(admin.sessionId);
  await audit({ userId: admin.id, action: "logout" });
  return new Response(null, { status: 204, headers: { "set-cookie": clearedSessionCookie() } });
});
