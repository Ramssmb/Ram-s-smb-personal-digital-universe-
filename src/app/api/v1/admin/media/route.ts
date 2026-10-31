import { requireAdmin } from "@/server/auth/guard";
import { AppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { intParam } from "@/server/http/params";
import { listMedia, uploadMedia } from "@/server/media/service";

// Multipart overhead on top of the 15 MB file limit.
const MAX_UPLOAD_REQUEST_BYTES = 16 * 1024 * 1024;

export const GET = apiHandler(async ({ request }) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  return Response.json(
    await listMedia({
      q: url.searchParams.get("q") ?? undefined,
      kind: url.searchParams.get("kind") ?? undefined,
      page: intParam(url.searchParams.get("page"), 1),
    }),
  );
});

export const POST = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_REQUEST_BYTES)
    throw new AppError("payload_too_large", "Files can be at most 15 MB.");
  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    throw new AppError("unsupported_media_type", "Upload files as multipart form data.");
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("validation_failed", "Choose a file to upload.");
  const item = await uploadMedia(
    file,
    { access: form.get("access") ?? undefined, altText: form.get("altText") ?? undefined },
    admin,
  );
  return Response.json({ item }, { status: 201 });
});
