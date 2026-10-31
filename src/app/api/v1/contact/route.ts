import { readJson } from "@/server/http/body";
import { apiHandler } from "@/server/http/handler";
import { assertSameOrigin } from "@/server/security/origin";
import { submitContact } from "@/server/services/contact";

export const POST = apiHandler(async ({ request }) => {
  assertSameOrigin(request);
  await submitContact(await readJson(request), request.headers);
  return Response.json({ ok: true }, { status: 202 });
});
