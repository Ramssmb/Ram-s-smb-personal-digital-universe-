import { existsSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { POST as contactRoute } from "@/app/api/v1/contact/route";
import { POST as collectionPost } from "@/app/api/v1/admin/collections/[collection]/route";
import { POST as itemAction } from "@/app/api/v1/admin/collections/[collection]/[id]/[action]/route";
import { DELETE as mediaDelete, PATCH as mediaPatch } from "@/app/api/v1/admin/media/[id]/route";
import { GET as mediaFile } from "@/app/api/v1/admin/media/[id]/file/route";
import { POST as mediaUpload } from "@/app/api/v1/admin/media/route";
import { PATCH as messagePatch } from "@/app/api/v1/admin/messages/[id]/route";
import { GET as publicMedia } from "@/app/media/[...path]/route";
import { getProject } from "@/server/content/public";
import { issueFormToken } from "@/server/services/contact";

import {
  createAdmin,
  ownerSql,
  request,
  resetDatabase,
  routeContext,
  uniqueIp,
  type Admin,
} from "../support/integration";

let admin: Admin;

beforeEach(async () => {
  await resetDatabase();
  admin = await createAdmin();
});

async function jpegWithGps(width = 1200, height = 800): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 40, g: 90, b: 200 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestCam", Model: "Secret Model" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "31/1 19/1 0/1" },
    })
    .toBuffer();
}

async function upload(data: ArrayLike<number>, name: string, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(data)], name));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return mediaUpload(
    request("POST", "/api/v1/admin/media", { cookie: admin.cookie, body: form }),
    routeContext(),
  );
}

describe("media uploads", () => {
  it("re-encodes images to WebP variants and strips EXIF and GPS data", async () => {
    const original = await jpegWithGps();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const response = await upload(original, "holiday.jpg", { altText: "A blue square" });
    expect(response.status).toBe(201);
    const { item } = await response.json();
    expect(item).toMatchObject({
      kind: "image",
      mimeType: "image/webp",
      width: 1200,
      height: 800,
      altText: "A blue square",
    });
    expect(item.storageKey).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
    expect(item.variants.map((v: { width: number }) => v.width)).toEqual([480, 960]);

    const served = await publicMedia(new Request("http://localhost/media/x"), {
      params: Promise.resolve({ path: item.storageKey.split("/") }),
    });
    expect(served.status).toBe(200);
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    const stored = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
    expect(stored.format).toBe("webp");
    expect(stored.exif).toBeUndefined();
  });

  it("rejects files whose content is not an allowed type, whatever their name", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect((await upload(svg, "logo.png")).status).toBe(415);
    const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
    expect((await upload(html, "cv.pdf")).status).toBe(415);
    expect(await ownerSql`SELECT 1 FROM media_assets`).toHaveLength(0);
  });

  it("rejects corrupt images and oversized files", async () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, ...new Array(100).fill(7)]);
    expect((await upload(fakeJpeg, "broken.jpg")).status).toBe(415);
    const big = new Uint8Array(16 * 1024 * 1024);
    big.set(new TextEncoder().encode("%PDF-1.7"));
    expect((await upload(big, "huge.pdf")).status).toBe(413);
  });

  it("never serves private files publicly, but serves them to the owner", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj << >> endobj\ntrailer\n%%EOF");
    const { item } = await (await upload(pdf, "marksheet.pdf", { access: "private" })).json();
    expect(item.access).toBe("private");
    expect(existsSync(join(process.env.STORAGE_DIR!, "public", item.storageKey))).toBe(false);

    const anonymous = await publicMedia(new Request("http://localhost/media/x"), {
      params: Promise.resolve({ path: item.storageKey.split("/") }),
    });
    expect(anonymous.status).toBe(404);
    const owner = await mediaFile(
      request("GET", "/x", { cookie: admin.cookie }),
      routeContext({ id: item.id }),
    );
    expect(owner.status).toBe(200);
    expect(owner.headers.get("cache-control")).toContain("no-store");
    expect(owner.headers.get("content-security-policy")).toBe("sandbox");
    const noSession = await mediaFile(request("GET", "/x"), routeContext({ id: item.id }));
    expect(noSession.status).toBe(401);
  });

  it("refuses path traversal in public media URLs", async () => {
    for (const path of [
      ["..", "..", "etc", "passwd"],
      ["private", "2026", "01", "x.pdf"],
      ["2026", "01", "..%2f..%2fsecret"],
    ]) {
      const response = await publicMedia(new Request("http://localhost/media/x"), {
        params: Promise.resolve({ path }),
      });
      expect(response.status).toBe(404);
    }
  });

  it("blocks deleting or hiding a file that content uses, and requires alt text to publish", async () => {
    const { item: image } = await (await upload(await jpegWithGps(600, 400), "cover.jpg")).json();
    const projectResponse = await collectionPost(
      request("POST", "/x", {
        cookie: admin.cookie,
        json: {
          title: "Cover test",
          summary: "S",
          projectStatus: "planned",
          coverMediaId: image.id,
        },
      }),
      routeContext({ collection: "projects" }),
    );
    const { item: project } = await projectResponse.json();

    const publishWithoutAlt = await itemAction(
      request("POST", "/x", { cookie: admin.cookie }),
      routeContext({ collection: "projects", id: project.id, action: "publish" }),
    );
    expect(publishWithoutAlt.status).toBe(400);

    expect(
      (
        await mediaPatch(
          request("PATCH", "/x", { cookie: admin.cookie, json: { altText: "Project cover" } }),
          routeContext({ id: image.id }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await itemAction(
          request("POST", "/x", { cookie: admin.cookie }),
          routeContext({ collection: "projects", id: project.id, action: "publish" }),
        )
      ).status,
    ).toBe(200);
    expect((await getProject("cover-test"))?.cover?.alt).toBe("Project cover");

    expect(
      (
        await mediaDelete(
          request("DELETE", "/x", { cookie: admin.cookie }),
          routeContext({ id: image.id }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await mediaPatch(
          request("PATCH", "/x", { cookie: admin.cookie, json: { access: "private" } }),
          routeContext({ id: image.id }),
        )
      ).status,
    ).toBe(409);
  });

  it("moves files when access changes and deletes them from disk", async () => {
    const { item } = await (await upload(await jpegWithGps(500, 500), "photo.jpg")).json();
    const publicPath = join(process.env.STORAGE_DIR!, "public", item.storageKey);
    const privatePath = join(process.env.STORAGE_DIR!, "private", item.storageKey);
    expect(existsSync(publicPath)).toBe(true);
    await mediaPatch(
      request("PATCH", "/x", { cookie: admin.cookie, json: { access: "private" } }),
      routeContext({ id: item.id }),
    );
    expect(existsSync(publicPath)).toBe(false);
    expect(existsSync(privatePath)).toBe(true);
    expect(
      (
        await mediaDelete(
          request("DELETE", "/x", { cookie: admin.cookie }),
          routeContext({ id: item.id }),
        )
      ).status,
    ).toBe(204);
    expect(existsSync(privatePath)).toBe(false);
  });
});

describe("contact form", () => {
  const valid = () => ({
    name: "Visitor",
    email: "Visitor@Example.test",
    subject: "Hello",
    message: "I enjoyed your journal entry.",
    website: "",
    formToken: issueFormToken(Date.now() - 10_000),
  });

  async function send(json: Record<string, unknown>, ip = uniqueIp()) {
    return contactRoute(request("POST", "/api/v1/contact", { json, ip }), routeContext());
  }

  it("stores a valid message without the sender's raw IP address", async () => {
    const ip = uniqueIp();
    expect((await send(valid(), ip)).status).toBe(202);
    const [row] = await ownerSql<
      { email: string; status: string; ip_hash: string }[]
    >`SELECT email, status, ip_hash FROM contact_messages`;
    expect(row).toMatchObject({ email: "visitor@example.test", status: "new" });
    expect(row?.ip_hash).not.toContain(ip);
  });

  it("validates input on the server", async () => {
    const response = await send({ ...valid(), email: "nope", message: "hi" });
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(Object.keys(error.fields).sort()).toEqual(["email", "message"]);
    expect(await ownerSql`SELECT 1 FROM contact_messages`).toHaveLength(0);
  });

  it("silently files honeypot and too-fast submissions as spam", async () => {
    expect((await send({ ...valid(), website: "http://spam.test" })).status).toBe(202);
    expect((await send({ ...valid(), formToken: issueFormToken() })).status).toBe(202);
    const rows = await ownerSql<{ status: string }[]>`SELECT status FROM contact_messages`;
    expect(rows.map((r) => r.status)).toEqual(["spam", "spam"]);
  });

  it("rejects forged form tokens", async () => {
    expect((await send({ ...valid(), formToken: "1700000000000.forged" })).status).toBe(400);
  });

  it("limits submissions per address", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 3; i++) expect((await send(valid(), ip)).status).toBe(202);
    const limited = await send(valid(), ip);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("rejects cross-site submissions", async () => {
    const response = await contactRoute(
      request("POST", "/api/v1/contact", { json: valid(), origin: "https://evil.test" }),
      routeContext(),
    );
    expect(response.status).toBe(403);
  });

  it("is refused when the owner closes the form", async () => {
    await ownerSql`INSERT INTO site_settings (id, contact_enabled) VALUES (1, false)`;
    expect((await send(valid())).status).toBe(403);
  });

  it("lets the owner triage messages", async () => {
    await send(valid());
    const [row] = await ownerSql<{ id: string }[]>`SELECT id FROM contact_messages`;
    expect(
      (
        await messagePatch(
          request("PATCH", "/x", { cookie: admin.cookie, json: { status: "archived" } }),
          routeContext({ id: row!.id }),
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await messagePatch(
          request("PATCH", "/x", { cookie: admin.cookie, json: { status: "deleted" } }),
          routeContext({ id: row!.id }),
        )
      ).status,
    ).toBe(400);
  });
});
