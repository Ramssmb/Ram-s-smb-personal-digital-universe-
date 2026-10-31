import { requireAdmin } from "@/server/auth/guard";
import { createItem, listItems } from "@/server/content/service";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { collectionParam, intParam } from "@/server/http/params";

export const GET = apiHandler(async ({ request, params }) => {
  await requireAdmin(request);
  const key = collectionParam(params);
  const url = new URL(request.url);
  const result = await listItems(key, {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: intParam(url.searchParams.get("page"), 1),
    pageSize: intParam(url.searchParams.get("pageSize"), 25),
  });
  return Response.json(result);
});

export const POST = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  const key = collectionParam(params);
  const item = await createItem(key, await readJson(request), admin);
  return Response.json({ item }, { status: 201 });
});
