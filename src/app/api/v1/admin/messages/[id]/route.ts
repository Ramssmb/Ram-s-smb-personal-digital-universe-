import { requireAdmin } from "@/server/auth/guard";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { param } from "@/server/http/params";
import { deleteMessage, updateMessage } from "@/server/services/contact";

export const PATCH = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  await updateMessage(param(params, "id"), await readJson(request), admin);
  return new Response(null, { status: 204 });
});

export const DELETE = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  await deleteMessage(param(params, "id"), admin);
  return new Response(null, { status: 204 });
});
