import { requireAdmin } from "@/server/auth/guard";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { confirmTotpSetup } from "@/server/services/auth";

/** Confirms setup with a first code; returns the one-time recovery codes. */
export const POST = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  return Response.json(await confirmTotpSetup(admin.id, admin.sessionId, await readJson(request)));
});
