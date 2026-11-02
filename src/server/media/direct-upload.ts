import "server-only";

import { and, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";

import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { uploadIntents } from "@/server/db/schema";
import { env } from "@/server/env";
import { AppError } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { enforce, RULES } from "@/server/security/rate-limit";

import { getMedia, replaceMediaFile, uploadMedia, type MediaRow } from "./service";
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from "./sniff";
import { incomingSize, presignIncomingPut, readIncoming, removeIncoming } from "./storage";

/**
 * Direct uploads (UPLOAD_MODE=direct, docs/VERCEL_ARCHITECTURE.md §5).
 *
 * 1. `startUpload`: the owner says what they will upload; the app records an
 *    intent and returns a signed URL for one PUT to `incoming/<intent id>`.
 * 2. The browser PUTs the file straight to the bucket, so it never passes
 *    through a size-limited serverless function.
 * 3. `completeUpload`: the app consumes the intent (once), checks the stored
 *    size, downloads the file and runs the same validation and processing as a
 *    form upload. The incoming object is always deleted afterwards.
 */

const URL_TTL_SECONDS = 5 * 60;
const INTENT_TTL_MS = 10 * 60 * 1000;

const KIND_BY_TYPE = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/avif": "image",
  "application/pdf": "document",
} as const;

const startSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  contentType: z.string(),
  access: z.enum(["public", "private"]).default("public"),
  altText: z.string().trim().max(300).default(""),
  /** Replace the file of this media item instead of creating a new one. */
  mediaId: z.uuid().optional(),
});

export type StartUploadResult =
  | { mode: "form" }
  | {
      mode: "direct";
      id: string;
      url: string;
      headers: Record<string, string>;
      expiresAt: string;
    };

export async function startUpload(input: unknown, admin: SessionUser): Promise<StartUploadResult> {
  // Form mode keeps today's behaviour: the client posts the file to the app.
  if (env().UPLOAD_MODE !== "direct") return { mode: "form" };

  const data = startSchema.parse(input);
  const kind = KIND_BY_TYPE[data.contentType as keyof typeof KIND_BY_TYPE];
  if (!kind) {
    throw new AppError(
      "unsupported_media_type",
      "Upload a JPEG, PNG, WebP or AVIF image, or a PDF.",
    );
  }
  if (kind === "image" && data.size > MAX_IMAGE_BYTES)
    throw new AppError("payload_too_large", "Images can be at most 10 MB.");
  if (data.size > MAX_DOCUMENT_BYTES)
    throw new AppError("payload_too_large", "Files can be at most 15 MB.");

  let access = data.access;
  if (data.mediaId) {
    const current = await getMedia(data.mediaId);
    if (current.kind !== kind) {
      throw new AppError(
        "validation_failed",
        current.kind === "image"
          ? "Replace an image with another image."
          : "Replace a document with another PDF.",
      );
    }
    access = current.access as typeof access;
  }

  await enforce(RULES.uploadsPerUser, admin.id);
  const [intent] = await db()
    .insert(uploadIntents)
    .values({
      userId: admin.id,
      filename: data.filename,
      byteSize: data.size,
      contentType: data.contentType,
      access,
      altText: data.altText,
      mediaId: data.mediaId ?? null,
      expiresAt: new Date(Date.now() + INTENT_TTL_MS),
    })
    .returning();
  const signed = await presignIncomingPut(intent!.id, data.contentType, data.size, URL_TTL_SECONDS);
  return {
    mode: "direct",
    id: intent!.id,
    url: signed.url,
    headers: signed.headers,
    expiresAt: intent!.expiresAt.toISOString(),
  };
}

export async function completeUpload(id: string, admin: SessionUser): Promise<MediaRow> {
  if (env().UPLOAD_MODE !== "direct") throw new AppError("not_found");
  if (!z.uuid().safeParse(id).success) throw new AppError("not_found");

  // Deleting the intent is what makes it single-use, even under concurrent requests.
  const [intent] = await db()
    .delete(uploadIntents)
    .where(
      and(
        eq(uploadIntents.id, id),
        eq(uploadIntents.userId, admin.id),
        gt(uploadIntents.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!intent) {
    throw new AppError("not_found", "This upload has expired or was already finished.");
  }

  try {
    // Check the size before downloading, so an oversized object never reaches memory.
    const size = await incomingSize(id);
    if (size === null) {
      throw new AppError("validation_failed", "The file did not arrive. Upload it again.");
    }
    if (size !== intent.byteSize) {
      throw new AppError("validation_failed", "The uploaded file does not match. Upload it again.");
    }
    const data = await readIncoming(id);
    if (!data || data.length !== intent.byteSize) {
      throw new AppError("validation_failed", "The uploaded file does not match. Upload it again.");
    }
    const file = new File([new Uint8Array(data)], intent.filename);
    return intent.mediaId
      ? await replaceMediaFile(intent.mediaId, file, admin, { rateLimited: false })
      : await uploadMedia(file, { access: intent.access, altText: intent.altText }, admin, {
          rateLimited: false,
        });
  } finally {
    // Never let a failed clean-up hide the result (or the real error) of the upload.
    await removeIncoming(id).catch((error: unknown) =>
      logger.warn({ err: error, uploadId: id }, "could not remove incoming upload"),
    );
  }
}

/** Removes intents that were never completed, with any file they left behind. */
export async function pruneUploadIntents(now = new Date()): Promise<number> {
  const expired = await db()
    .delete(uploadIntents)
    .where(lt(uploadIntents.expiresAt, now))
    .returning({ id: uploadIntents.id });
  if (env().STORAGE_DRIVER === "s3") {
    for (const { id } of expired) await removeIncoming(id);
  }
  return expired.length;
}
