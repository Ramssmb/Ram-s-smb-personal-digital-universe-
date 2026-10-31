import { z } from "zod";

import { requireAdmin } from "@/server/auth/guard";
import { setFlags, transitionItem } from "@/server/content/service";
import { readJson } from "@/server/http/body";
import { AppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { collectionParam, param } from "@/server/http/params";

const flagsSchema = z
  .object({
    visibility: z.enum(["public", "private"]).optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

/** POST .../publish | unpublish | archive | flags */
export const POST = apiHandler(async ({ request, params }) => {
  const admin = await requireAdmin(request);
  const key = collectionParam(params);
  const id = param(params, "id");
  const action = param(params, "action");
  if (action === "flags") {
    return Response.json({
      item: await setFlags(key, id, flagsSchema.parse(await readJson(request)), admin),
    });
  }
  if (action !== "publish" && action !== "unpublish" && action !== "archive")
    throw new AppError("not_found");
  return Response.json({ item: await transitionItem(key, id, action, admin) });
});
