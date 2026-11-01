import { requireAdmin } from "@/server/auth/guard";
import { readUploadForm } from "@/server/http/body";
import { AppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { param } from "@/server/http/params";
import { getMedia, replaceMediaFile } from "@/server/media/service";
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

/** Replaces the file behind a media item; everything that uses it shows the new file. */
export const PUT = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  const { file } = await readUploadForm(request);
  return Response.json({ item: await replaceMediaFile(param(params, "id"), file, admin) });
});
