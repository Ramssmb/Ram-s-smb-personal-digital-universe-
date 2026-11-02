import { requireAdmin } from "@/server/auth/guard";
import { apiHandler } from "@/server/http/handler";
import { param } from "@/server/http/params";
import { completeUpload } from "@/server/media/direct-upload";

/** Validates and processes a file the browser put into object storage. */
export const POST = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  return Response.json({ item: await completeUpload(param(params, "id"), admin) });
});
