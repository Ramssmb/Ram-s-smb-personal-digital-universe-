import { GET as cronMaintenance } from "@/app/api/cron/maintenance/route";
import { POST as completeUpload } from "@/app/api/v1/admin/media/uploads/[id]/complete/route";
import { POST as startUpload } from "@/app/api/v1/admin/media/uploads/route";
import { runMaintenance } from "@/server/services/maintenance";

import {
  createAdmin,
  ownerSql,
  request,
  resetDatabase,
  routeContext,
  type Admin,
} from "../support/integration";

/**
 * Serverless support that works without object storage: the cron route and
 * the upload endpoints in their default "form" mode. The direct-upload flow
 * itself runs against a real S3 server in s3-storage.test.ts.
 */
const SECRET = "cron-secret-for-integration-tests";
// Read lazily by env(), so setting it before the first request is enough.
process.env.CRON_SECRET = SECRET;

let admin: Admin;

beforeEach(async () => {
  await resetDatabase();
  admin = await createAdmin();
});

describe("maintenance cron route", () => {
  it("refuses requests without the exact bearer secret", async () => {
    for (const authorization of [undefined, "Bearer wrong", SECRET, `Bearer ${SECRET}x`]) {
      const response = await cronMaintenance(
        request("GET", "/api/cron/maintenance", {
          headers: authorization ? { authorization } : {},
        }),
      );
      expect(response.status).toBe(401);
    }
  });

  it("runs the data-retention job and reports what it removed", async () => {
    await ownerSql`INSERT INTO audit_log (action, created_at) VALUES ('ancient', now() - interval '400 days')`;
    const response = await cronMaintenance(
      request("GET", "/api/cron/maintenance", { headers: { authorization: `Bearer ${SECRET}` } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).removed).toEqual({ auditLog: 1, spam: 0, uploads: 0 });
  });
});

describe("upload endpoints in form mode", () => {
  it("tell the client to post the file to the app", async () => {
    const response = await startUpload(
      request("POST", "/api/v1/admin/media/uploads", {
        cookie: admin.cookie,
        json: { filename: "a.png", size: 10, contentType: "image/png" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mode: "form" });
  });

  it("have no upload to complete", async () => {
    const response = await completeUpload(
      request("POST", "/x", { cookie: admin.cookie }),
      routeContext({ id: "00000000-0000-4000-8000-000000000000" }),
    );
    expect(response.status).toBe(404);
  });

  it("reject other origins", async () => {
    const response = await startUpload(
      request("POST", "/api/v1/admin/media/uploads", {
        cookie: admin.cookie,
        origin: "https://evil.test",
        json: {},
      }),
    );
    expect(response.status).toBe(403);
  });
});

describe("upload intent retention", () => {
  it("removes only expired intents", async () => {
    await ownerSql`INSERT INTO upload_intents (user_id, filename, byte_size, content_type, expires_at) VALUES
      (${admin.id}, 'old.png', 10, 'image/png', now() - interval '1 minute'),
      (${admin.id}, 'new.png', 10, 'image/png', now() + interval '5 minutes')`;
    expect((await runMaintenance()).uploads).toBe(1);
    const rows = await ownerSql`SELECT filename FROM upload_intents`;
    expect(rows.map((r) => r.filename)).toEqual(["new.png"]);
  });
});
