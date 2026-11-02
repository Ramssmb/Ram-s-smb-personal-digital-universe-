import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import sharp, { type Sharp } from "sharp";
import { z } from "zod";

import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import {
  achievements,
  certifications,
  journalMedia,
  mediaAssets,
  profile,
  projectMedia,
  projects,
  siteSettings,
  type MediaVariant,
} from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { sha256Hex } from "@/server/security/crypto";
import { enforce, RULES } from "@/server/security/rate-limit";
import { audit } from "@/server/services/audit";

import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, sniff } from "./sniff";
import { moveFile, putFile, removeFile, type Access } from "./storage";

export type MediaRow = typeof mediaAssets.$inferSelect;

const VARIANT_WIDTHS = [480, 960, 1600];
const MAX_STORED_WIDTH = 2400;
const MAX_INPUT_PIXELS = 40_000_000;

function keyBase(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}`;
}

function allKeys(row: Pick<MediaRow, "storageKey" | "variants">): string[] {
  return [row.storageKey, ...row.variants.map((v) => v.key)];
}

export const uploadMetaSchema = z.object({
  access: z.enum(["public", "private"]).default("public"),
  altText: z.string().trim().max(300).default(""),
});

/** The stored-file columns of a media row, produced by `storeFile`. */
type StoredFile = Pick<
  MediaRow,
  | "storageKey"
  | "kind"
  | "mimeType"
  | "byteSize"
  | "sha256"
  | "width"
  | "height"
  | "variants"
  | "originalFilename"
>;

/**
 * Validates an upload and writes it to storage under fresh random keys.
 * Images are decoded and re-encoded to WebP (dropping EXIF, GPS and anything
 * appended to the file) in several widths; PDFs are stored as-is after their
 * signature is checked. On failure every file written so far is removed.
 */
async function storeFile(
  file: File,
  access: Access,
): Promise<{ stored: StoredFile; written: string[] }> {
  if (file.size === 0) throw new AppError("validation_failed", "The file is empty.");
  if (file.size > MAX_DOCUMENT_BYTES)
    throw new AppError("payload_too_large", "Files can be at most 15 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) {
    throw new AppError(
      "unsupported_media_type",
      "Upload a JPEG, PNG, WebP or AVIF image, or a PDF.",
    );
  }
  const base = keyBase();
  const originalFilename = (file.name || "upload").replace(/[^\w.\- ()]/g, "_").slice(0, 200);
  const sha256 = sha256Hex(Buffer.from(bytes));
  const written: string[] = [];

  try {
    if (type.kind === "document") {
      const key = `${base}.pdf`;
      await putFile(access, key, bytes);
      written.push(key);
      return {
        written,
        stored: {
          storageKey: key,
          kind: "document",
          mimeType: type.mime,
          byteSize: bytes.length,
          sha256,
          width: null,
          height: null,
          variants: [],
          originalFilename,
        },
      };
    }

    if (bytes.length > MAX_IMAGE_BYTES)
      throw new AppError("payload_too_large", "Images can be at most 10 MB.");
    let image: Sharp;
    let width: number;
    let height: number;
    try {
      image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
      const info = await image.metadata();
      // .rotate() applies EXIF orientation, which may swap the dimensions.
      const swapped = (info.orientation ?? 1) >= 5;
      width = (swapped ? info.height : info.width) ?? 0;
      height = (swapped ? info.width : info.height) ?? 0;
      if (!width || !height) throw new Error("no dimensions");
    } catch {
      throw new AppError("unsupported_media_type", "This image could not be read.");
    }

    const storedWidth = Math.min(width, MAX_STORED_WIDTH);
    const original = await image
      .clone()
      .resize({ width: storedWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const storageKey = `${base}.webp`;
    await putFile(access, storageKey, original);
    written.push(storageKey);

    const variants: MediaVariant[] = [];
    for (const target of VARIANT_WIDTHS) {
      if (target >= storedWidth) continue;
      const data = await image.clone().resize({ width: target }).webp({ quality: 80 }).toBuffer();
      const key = `${base}-${target}.webp`;
      await putFile(access, key, data);
      written.push(key);
      variants.push({ width: target, key, byteSize: data.length });
    }

    return {
      written,
      stored: {
        storageKey,
        kind: "image",
        mimeType: "image/webp",
        byteSize: original.length,
        sha256,
        width: storedWidth,
        height: Math.round((height * storedWidth) / width),
        variants,
        originalFilename,
      },
    };
  } catch (error) {
    // Do not leave orphaned files behind when anything fails.
    await Promise.all(written.map((key) => removeFile(access, key)));
    throw error;
  }
}

/**
 * Stores a new upload and creates its media row. Direct uploads were already
 * rate-limited when their signed URL was issued (`rateLimited: false`).
 */
export async function uploadMedia(
  file: File,
  meta: unknown,
  admin: SessionUser,
  { rateLimited = true }: { rateLimited?: boolean } = {},
): Promise<MediaRow> {
  if (rateLimited) await enforce(RULES.uploadsPerUser, admin.id);
  const { access, altText } = uploadMetaSchema.parse(meta);
  const { stored, written } = await storeFile(file, access);
  try {
    const [row] = await db()
      .insert(mediaAssets)
      .values({ ...stored, access, altText, uploadedBy: admin.id })
      .returning();
    await audit({ userId: admin.id, action: "upload", entityType: "media", entityId: row!.id });
    return row!;
  } catch (error) {
    await Promise.all(written.map((key) => removeFile(access, key)));
    throw error;
  }
}

/**
 * Replaces the file behind an existing media item. The id, alt text and access
 * stay the same, so every page that uses the item shows the new file. New
 * storage keys are used because public files are cached as immutable; the old
 * files are removed only after the row points at the new ones.
 */
export async function replaceMediaFile(
  id: string,
  file: File,
  admin: SessionUser,
  { rateLimited = true }: { rateLimited?: boolean } = {},
): Promise<MediaRow> {
  if (rateLimited) await enforce(RULES.uploadsPerUser, admin.id);
  const current = await getMedia(id);
  const access = current.access as Access;
  const { stored, written } = await storeFile(file, access);
  if (stored.kind !== current.kind) {
    await Promise.all(written.map((key) => removeFile(access, key)));
    throw new AppError(
      "validation_failed",
      current.kind === "image"
        ? "Replace an image with another image."
        : "Replace a document with another PDF.",
    );
  }
  let updated: MediaRow | undefined;
  try {
    [updated] = await db()
      .update(mediaAssets)
      .set({ ...stored, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id))
      .returning();
  } catch (error) {
    await Promise.all(written.map((key) => removeFile(access, key)));
    throw error;
  }
  if (!updated) throw new AppError("not_found");
  await Promise.all(allKeys(current).map((key) => removeFile(access, key)));
  await audit({ userId: admin.id, action: "replace_file", entityType: "media", entityId: id });
  return updated;
}

export async function listMedia(
  options: { q?: string; kind?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 48));
  const filters = [];
  const q = options.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    filters.push(
      or(ilike(mediaAssets.originalFilename, pattern), ilike(mediaAssets.altText, pattern)),
    );
  }
  if (options.kind === "image" || options.kind === "document")
    filters.push(eq(mediaAssets.kind, options.kind));
  const where = filters.length ? and(...filters) : undefined;
  const [items, [total]] = await Promise.all([
    db()
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ value: count() }).from(mediaAssets).where(where),
  ]);
  return { items, total: Number(total?.value ?? 0), page, pageSize };
}

export async function getMedia(id: string): Promise<MediaRow> {
  if (!z.uuid().safeParse(id).success) throw new AppError("not_found");
  const [row] = await db().select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!row) throw new AppError("not_found");
  return row;
}

export const mediaUpdateSchema = z.object({
  altText: z.string().trim().max(300).optional(),
  access: z.enum(["public", "private"]).optional(),
});

/** Updates alt text and/or access. Changing access moves the files between folders. */
export async function updateMedia(
  id: string,
  input: unknown,
  admin: SessionUser,
): Promise<MediaRow> {
  const data = mediaUpdateSchema.parse(input);
  const row = await getMedia(id);
  if (data.access && data.access !== row.access) {
    if (data.access === "private" && (await usagesOf(id)).length) {
      throw new AppError(
        "conflict",
        "This file is used by content. Remove it there before making it private.",
      );
    }
    for (const key of allKeys(row)) await moveFile(row.access as Access, data.access, key);
  }
  const [updated] = await db()
    .update(mediaAssets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mediaAssets.id, id))
    .returning();
  await audit({
    userId: admin.id,
    action: "update",
    entityType: "media",
    entityId: id,
    summary: { fields: Object.keys(data) },
  });
  return updated!;
}

/** Where a file is used, so it is never deleted (or hidden) out from under content. */
export async function usagesOf(id: string): Promise<string[]> {
  const checks = await Promise.all([
    db().select({ n: count() }).from(projects).where(eq(projects.coverMediaId, id)),
    db().select({ n: count() }).from(projectMedia).where(eq(projectMedia.mediaId, id)),
    db().select({ n: count() }).from(journalMedia).where(eq(journalMedia.mediaId, id)),
    db().select({ n: count() }).from(certifications).where(eq(certifications.mediaId, id)),
    db().select({ n: count() }).from(achievements).where(eq(achievements.mediaId, id)),
    db().select({ n: count() }).from(profile).where(eq(profile.photoId, id)),
    db().select({ n: count() }).from(siteSettings).where(eq(siteSettings.ogImageId, id)),
  ]);
  const names = [
    "projects",
    "project screenshots",
    "journal",
    "certifications",
    "achievements",
    "profile",
    "settings",
  ];
  return names.filter((_, index) => Number(checks[index]?.[0]?.n ?? 0) > 0);
}

export async function deleteMedia(id: string, admin: SessionUser): Promise<void> {
  const row = await getMedia(id);
  const usages = await usagesOf(id);
  if (usages.length) {
    throw new AppError(
      "conflict",
      `This file is still used in: ${usages.join(", ")}. Remove it there first.`,
    );
  }
  await db().delete(mediaAssets).where(eq(mediaAssets.id, id));
  await Promise.all(allKeys(row).map((key) => removeFile(row.access as Access, key)));
  await audit({ userId: admin.id, action: "delete", entityType: "media", entityId: id });
}

/** Public URL for a public file (never call this for private files). */
export function mediaUrl(key: string): string {
  return `/media/${key}`;
}
