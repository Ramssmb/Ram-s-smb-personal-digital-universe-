import { requireAdmin } from "@/server/auth/guard";
import { AppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { param } from "@/server/http/params";
import { getMedia } from "@/server/media/service";
import { readStoredFile, type Access } from "@/server/media/storage";

/** Streams any file — including private ones — to the signed-in owner only. */
export const GET = apiHandler(async ({ request, params }) => {
  await requireAdmin(request);
  const row = await getMedia(param(params, "id"));
  const data = await readStoredFile(row.access as Access, row.storageKey);
  if (!data) throw new AppError("not_found");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": row.mimeType,
      "content-length": String(data.length),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox",
      "content-disposition": `inline; filename="${row.originalFilename.replace(/"/g, "")}"`,
    },
  });
});
