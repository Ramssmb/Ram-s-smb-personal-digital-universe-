import sharp from "sharp";

import { isValidKey, readStoredFile } from "@/server/media/storage";
import { SHARE_IMAGE } from "@/server/seo";

/**
 * Link-preview copy of a public image: `/media/og/<key>.jpg` returns the image
 * at `/media/<key>` cropped to 1200 × 630 as JPEG, which every link-preview
 * client accepts (some handle WebP inconsistently). Public files only; keys
 * never change content, so the result is cached forever.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const requested = (await params).path.join("/");
  const key = requested.replace(/\.jpg$/, "");
  if (key === requested || !key.endsWith(".webp") || !isValidKey(key)) {
    return new Response("Not found", { status: 404 });
  }
  const data = await readStoredFile("public", key);
  if (!data) return new Response("Not found", { status: 404 });
  const jpeg = await sharp(data)
    .resize(SHARE_IMAGE.width, SHARE_IMAGE.height, { fit: "cover", position: "attention" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(jpeg.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
