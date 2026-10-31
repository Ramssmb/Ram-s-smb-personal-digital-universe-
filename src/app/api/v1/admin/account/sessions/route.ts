import { requireAdmin } from "@/server/auth/guard";
import { revokeOtherSessions } from "@/server/auth/session";
import { apiHandler } from "@/server/http/handler";
import { audit } from "@/server/services/audit";

/** Signs out every other browser and device. */
export const DELETE = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  const revoked = await revokeOtherSessions(admin.id, admin.sessionId);
  await audit({ userId: admin.id, action: "sign_out_others", summary: { revoked } });
  return Response.json({ revoked });
});
