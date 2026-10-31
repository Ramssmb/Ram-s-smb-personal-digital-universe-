import { z } from "zod";

import { requireAdmin } from "@/server/auth/guard";
import { reorderItems } from "@/server/content/service";
import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { collectionParam } from "@/server/http/params";

const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

export const POST = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  const { ids } = reorderSchema.parse(await readJson(request));
  await reorderItems(collectionParam(params), ids, admin);
  return new Response(null, { status: 204 });
});
