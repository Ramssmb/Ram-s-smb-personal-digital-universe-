import { requireAdmin } from "@/server/auth/guard";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { startUpload } from "@/server/media/direct-upload";

/**
 * Starts an upload. With UPLOAD_MODE=direct it returns a signed URL for the
 * browser to put the file into object storage; otherwise `{ mode: "form" }`
 * tells the client to post the file to /api/v1/admin/media as before.
 */
export const POST = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  return Response.json(await startUpload(await readJson(request), admin));
});
