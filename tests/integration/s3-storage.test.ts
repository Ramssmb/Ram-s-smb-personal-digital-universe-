import { AwsClient } from "aws4fetch";
import sharp from "sharp";

import { GET as publicMedia } from "@/app/media/[...path]/route";
import { PUT as mediaReplace } from "@/app/api/v1/admin/media/[id]/file/route";
import { DELETE as mediaDelete, PATCH as mediaPatch } from "@/app/api/v1/admin/media/[id]/route";
import { POST as mediaUpload } from "@/app/api/v1/admin/media/route";
import { POST as completeUpload } from "@/app/api/v1/admin/media/uploads/[id]/complete/route";
import { POST as startUpload } from "@/app/api/v1/admin/media/uploads/route";
import { putFile } from "@/server/media/storage";
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
 * Runs the media workflow against a real S3-compatible server. CI starts one
 * (see .github/workflows/ci.yml) and sets S3_TEST_ENDPOINT; locally the suite
 * is skipped unless you point it at a server of your own.
 */
const endpoint = process.env.S3_TEST_ENDPOINT;
const bucket = `media-test-${Date.now()}`;
const credentials = { accessKeyId: "test", secretAccessKey: "test-secret-key" };

if (endpoint) {
  // Must happen before anything reads (and caches) the configuration.
  process.env.STORAGE_DRIVER = "s3";
  process.env.S3_ENDPOINT = endpoint;
  process.env.S3_REGION = "us-east-1";
  process.env.S3_BUCKET = bucket;
  process.env.S3_ACCESS_KEY_ID = credentials.accessKeyId;
  process.env.S3_SECRET_ACCESS_KEY = credentials.secretAccessKey;
  // Direct uploads on: form uploads (the routes above) keep working alongside.
  process.env.UPLOAD_MODE = "direct";
}

const client = new AwsClient({ ...credentials, region: "us-east-1", service: "s3" });
const objectUrl = (path: string) => `${endpoint}/${bucket}/${path}`;
const objectExists = async (path: string) =>
  (await client.fetch(objectUrl(path), { method: "HEAD" })).ok;

describe.skipIf(!endpoint)("S3-compatible media storage", () => {
  let admin: Admin;

  beforeAll(async () => {
    const created = await client.fetch(`${endpoint}/${bucket}`, { method: "PUT" });
    expect(created.ok).toBe(true);
  });

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin();
  });

  async function upload(data: Uint8Array, name: string, fields: Record<string, string> = {}) {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(data)], name));
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    const response = await mediaUpload(
      request("POST", "/x", { cookie: admin.cookie, body: form }),
      routeContext(),
    );
    expect(response.status).toBe(201);
    return (await response.json()).item;
  }

  const png = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: "#2f5bea" } })
      .png()
      .toBuffer();

  it("stores uploads in the bucket and serves public files through the app", async () => {
    const item = await upload(await png(1200, 600), "cover.png", { altText: "Cover" });
    expect(await objectExists(`public/${item.storageKey}`)).toBe(true);
    for (const variant of item.variants)
      expect(await objectExists(`public/${variant.key}`)).toBe(true);

    const served = await publicMedia(new Request("http://localhost/media/x"), {
      params: Promise.resolve({ path: item.storageKey.split("/") }),
    });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/webp");
    expect((await sharp(Buffer.from(await served.arrayBuffer())).metadata()).width).toBe(1200);
  });

  it("keeps private files under the private prefix and never serves them publicly", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj << >> endobj\ntrailer\n%%EOF");
    const item = await upload(pdf, "transcript.pdf", { access: "private" });
    expect(await objectExists(`private/${item.storageKey}`)).toBe(true);
    expect(await objectExists(`public/${item.storageKey}`)).toBe(false);
    const anonymous = await publicMedia(new Request("http://localhost/media/x"), {
      params: Promise.resolve({ path: item.storageKey.split("/") }),
    });
    expect(anonymous.status).toBe(404);
  });

  it("moves objects when access changes, replaces and deletes them", async () => {
    const item = await upload(await png(600, 300), "a.png");
    await mediaPatch(
      request("PATCH", "/x", { cookie: admin.cookie, json: { access: "private" } }),
      routeContext({ id: item.id }),
    );
    expect(await objectExists(`public/${item.storageKey}`)).toBe(false);
    expect(await objectExists(`private/${item.storageKey}`)).toBe(true);

    const form = new FormData();
    form.set("file", new File([new Uint8Array(await png(400, 200))], "b.png"));
    const replaced = await (
      await mediaReplace(
        request("PUT", "/x", { cookie: admin.cookie, body: form }),
        routeContext({ id: item.id }),
      )
    ).json();
    expect(await objectExists(`private/${item.storageKey}`)).toBe(false);
    expect(await objectExists(`private/${replaced.item.storageKey}`)).toBe(true);

    const deleted = await mediaDelete(
      request("DELETE", "/x", { cookie: admin.cookie }),
      routeContext({ id: item.id }),
    );
    expect(deleted.status).toBe(204);
    expect(await objectExists(`private/${replaced.item.storageKey}`)).toBe(false);
  });

  it("refuses to overwrite an existing object", async () => {
    const key = "2026/11/00000000-0000-4000-8000-000000000001.webp";
    await putFile("public", key, new Uint8Array([1, 2, 3]));
    await expect(putFile("public", key, new Uint8Array([4, 5, 6]))).rejects.toThrow(/HTTP 412/);
  });

  describe("direct uploads (signed URL, then complete)", () => {
    async function start(json: Record<string, unknown>) {
      return startUpload(
        request("POST", "/api/v1/admin/media/uploads", { cookie: admin.cookie, json }),
        routeContext(),
      );
    }

    async function begin(data: Uint8Array, contentType: string, extra = {}) {
      const response = await start({
        filename: "photo.png",
        size: data.length,
        contentType,
        ...extra,
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mode).toBe("direct");
      return body as { id: string; url: string; headers: Record<string, string> };
    }

    const put = (url: string, headers: Record<string, string>, data: Uint8Array) =>
      fetch(url, { method: "PUT", headers, body: new Uint8Array(data) });

    const complete = (id: string, cookie = admin.cookie) =>
      completeUpload(request("POST", "/x", { cookie }), routeContext({ id }));

    it("uploads through a signed URL and processes the file like a form upload", async () => {
      const data = await png(1200, 600);
      const intent = await begin(data, "image/png", { altText: "Direct", access: "private" });
      expect(intent.url).toContain(`/incoming/${intent.id}?`);
      expect(intent.url).toContain("X-Amz-Expires=300");
      expect((await put(intent.url, intent.headers, data)).ok).toBe(true);

      const response = await complete(intent.id);
      expect(response.status).toBe(200);
      const { item } = await response.json();
      expect(item).toMatchObject({ kind: "image", access: "private", altText: "Direct" });
      expect(await objectExists(`private/${item.storageKey}`)).toBe(true);
      expect(await objectExists(`incoming/${intent.id}`)).toBe(false);

      // Single use: the intent is gone.
      expect((await complete(intent.id)).status).toBe(404);
    });

    it("replaces a media item's file in place", async () => {
      const original = await upload(await png(600, 300), "a.png");
      const data = await png(400, 200);
      const intent = await begin(data, "image/png", { mediaId: original.id });
      expect((await put(intent.url, intent.headers, data)).ok).toBe(true);
      const { item } = await (await complete(intent.id)).json();
      expect(item.id).toBe(original.id);
      expect(item.width).toBe(400);
      expect(await objectExists(`public/${original.storageKey}`)).toBe(false);
      expect(await objectExists(`public/${item.storageKey}`)).toBe(true);
    });

    it("refuses files the store did not receive as signed", async () => {
      const data = await png(300, 300);
      const intent = await begin(data, "image/png");
      // A different size than the one signed.
      const bigger = new Uint8Array([...data, 0, 0, 0]);
      expect((await put(intent.url, intent.headers, bigger)).ok).toBe(false);
      // Nothing arrived, so completing fails and leaves nothing behind.
      const response = await complete(intent.id);
      expect(response.status).toBe(400);
      expect(await objectExists(`incoming/${intent.id}`)).toBe(false);
    });

    it("validates the content, not just the declared type", async () => {
      const fake = new TextEncoder().encode("not really an image, just text");
      const intent = await begin(fake, "image/png");
      expect((await put(intent.url, intent.headers, fake)).ok).toBe(true);
      expect((await complete(intent.id)).status).toBe(415);
      expect(await objectExists(`incoming/${intent.id}`)).toBe(false);
      expect(await ownerSql`SELECT id FROM media_assets`).toHaveLength(0);
    });

    it("checks type and size before issuing a URL", async () => {
      expect((await start({ filename: "a.gif", size: 10, contentType: "image/gif" })).status).toBe(
        415,
      );
      expect(
        (await start({ filename: "a.png", size: 10 * 1024 * 1024 + 1, contentType: "image/png" }))
          .status,
      ).toBe(413);
      expect(
        (
          await start({
            filename: "a.pdf",
            size: 15 * 1024 * 1024 + 1,
            contentType: "application/pdf",
          })
        ).status,
      ).toBe(413);
      const ok = await start({
        filename: "a.pdf",
        size: 15 * 1024 * 1024,
        contentType: "application/pdf",
      });
      expect(ok.status).toBe(200);
    });

    it("does not let another session complete someone else's upload", async () => {
      const data = await png(200, 200);
      const intent = await begin(data, "image/png");
      expect((await put(intent.url, intent.headers, data)).ok).toBe(true);
      const other = await createAdmin();
      expect((await complete(intent.id, other.cookie)).status).toBe(404);
      expect((await complete(intent.id)).status).toBe(200);
    });

    it("cleans up uploads that were never completed", async () => {
      const data = await png(200, 200);
      const intent = await begin(data, "image/png");
      expect((await put(intent.url, intent.headers, data)).ok).toBe(true);
      await ownerSql`UPDATE upload_intents SET expires_at = now() - interval '1 minute'`;
      expect((await runMaintenance()).uploads).toBe(1);
      expect(await objectExists(`incoming/${intent.id}`)).toBe(false);
      expect((await complete(intent.id)).status).toBe(404);
    });
  });
});
