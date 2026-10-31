import { requireAdmin } from "@/server/auth/guard";
import { getSettingsRow, saveSettings } from "@/server/content/singletons";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";

export const GET = apiHandler(async ({ request }) => {
  await requireAdmin(request);
  return Response.json({ item: await getSettingsRow() });
});

export const PUT = apiHandler(async ({ request }) => {
  const admin = await requireAdmin(request);
  return Response.json({ item: await saveSettings(await readJson(request), admin) });
});
