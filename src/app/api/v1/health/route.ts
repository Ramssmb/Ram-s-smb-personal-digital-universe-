import { apiHandler } from "@/server/http/handler";
import { databaseReachable } from "@/server/services/health";

export const dynamic = "force-dynamic";

/** Liveness plus database reachability. Deliberately reveals no versions or details. */
export const GET = apiHandler(async () => {
  const ok = await databaseReachable();
  return Response.json({ status: ok ? "ok" : "unavailable" }, { status: ok ? 200 : 503 });
});
