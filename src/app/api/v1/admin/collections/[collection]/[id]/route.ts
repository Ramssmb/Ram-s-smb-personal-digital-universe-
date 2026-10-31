import { z } from "zod";

import { requireAdmin } from "@/server/auth/guard";
import { deleteItem, getItem, updateItem } from "@/server/content/service";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { collectionParam, param } from "@/server/http/params";

const patchSchema = z.object({ data: z.unknown(), updatedAt: z.string().max(40).optional() });

export const GET = apiHandler(async ({ request, params }) => {
  await requireAdmin(request);
  return Response.json({ item: await getItem(collectionParam(params), param(params, "id")) });
});

export const PATCH = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  const { data, updatedAt } = patchSchema.parse(await readJson(request));
  const item = await updateItem(
    collectionParam(params),
    param(params, "id"),
    data,
    updatedAt,
    admin,
  );
  return Response.json({ item });
});

export const DELETE = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  await deleteItem(collectionParam(params), param(params, "id"), admin);
  return new Response(null, { status: 204 });
});
