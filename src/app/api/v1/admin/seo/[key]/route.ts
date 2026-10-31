import { requireAdmin } from "@/server/auth/guard";
import { saveSeoPage } from "@/server/content/singletons";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { param } from "@/server/http/params";

export const PUT = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  await saveSeoPage(param(params, "key"), await readJson(request), admin);
  return new Response(null, { status: 204 });
});
