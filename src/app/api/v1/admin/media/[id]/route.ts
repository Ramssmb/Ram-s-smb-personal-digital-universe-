import { requireAdmin } from "@/server/auth/guard";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { param } from "@/server/http/params";
import { deleteMedia, getMedia, updateMedia, usagesOf } from "@/server/media/service";

export const GET = apiHandler(async ({ request, params }) => {
  await requireAdmin(request);
  const id = param(params, "id");
  return Response.json({ item: await getMedia(id), usages: await usagesOf(id) });
});

export const PATCH = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  return Response.json({
    item: await updateMedia(param(params, "id"), await readJson(request), admin),
  });
});

export const DELETE = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  await deleteMedia(param(params, "id"), admin);
  return new Response(null, { status: 204 });
});
