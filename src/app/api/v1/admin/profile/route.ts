import { requireAdmin } from "@/server/auth/guard";
import { getProfile, saveProfile } from "@/server/content/singletons";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";

export const GET = apiHandler(async ({ request }) => {
  await requireAdmin(request);
  return Response.json({ item: await getProfile() });
});

export const PUT = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  return Response.json({ item: await saveProfile(await readJson(request), admin) });
});
