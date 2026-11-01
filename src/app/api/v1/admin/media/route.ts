import { requireAdmin } from "@/server/auth/guard";
import { readUploadForm } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { intParam } from "@/server/http/params";
import { listMedia, uploadMedia } from "@/server/media/service";

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
  const { file, form } = await readUploadForm(request);
  const item = await uploadMedia(
    file,
    { access: form.get("access") ?? undefined, altText: form.get("altText") ?? undefined },
    admin,
  );
  return Response.json({ item }, { status: 201 });
});
