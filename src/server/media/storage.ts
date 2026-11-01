import "server-only";

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { AwsClient } from "aws4fetch";

import { env } from "@/server/env";

export type Access = "public" | "private";

const KEY_PATTERN = /^\d{4}\/\d{2}\/[0-9a-f-]{36}(?:-\d{2,4})?\.(?:webp|pdf)$/;

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

function assertKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new Error("invalid storage key");
}

/**
 * Where uploaded files live. Two drivers, chosen by STORAGE_DRIVER:
 *  - local: a directory (a Docker volume in production)
 *  - s3:    any S3-compatible bucket (Cloudflare R2, Backblaze B2, MinIO, AWS S3)
 * Public and private files are kept apart (folder or key prefix). Neither
 * driver ever hands out a direct URL: files are served by the app, so access
 * rules apply to every request and the bucket can stay private.
 */
interface StorageDriver {
  /** Fails if the key already exists: keys are random and must never collide silently. */
  put(access: Access, key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(access: Access, key: string): Promise<Buffer | null>;
  exists(access: Access, key: string): Promise<boolean>;
  move(from: Access, to: Access, key: string): Promise<void>;
  remove(access: Access, key: string): Promise<void>;
}

// ---------------------------------------------------------------- local disk

/** Resolves a key inside its folder, refusing anything that could escape it. */
export function pathFor(access: Access, key: string): string {
  assertKey(key);
  const base = resolve(env().STORAGE_DIR, access);
  const full = resolve(base, key);
  if (!full.startsWith(base + sep)) throw new Error("invalid storage key");
  return full;
}

const localDriver: StorageDriver = {
  async put(access, key, data) {
    const path = pathFor(access, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: "wx" });
  },
  async get(access, key) {
    try {
      return await readFile(pathFor(access, key));
    } catch {
      return null;
    }
  },
  async exists(access, key) {
    try {
      return (await stat(pathFor(access, key))).isFile();
    } catch {
      return false;
    }
  },
  async move(from, to, key) {
    const target = pathFor(to, key);
    await mkdir(dirname(target), { recursive: true });
    await rename(pathFor(from, key), target);
  },
  async remove(access, key) {
    await rm(pathFor(access, key), { force: true });
  },
};

// ---------------------------------------------------------------- S3-compatible

let s3Client: AwsClient | undefined;

function s3(): { client: AwsClient; objectUrl: (access: Access, key: string) => string } {
  const config = env();
  s3Client ??= new AwsClient({
    accessKeyId: config.S3_ACCESS_KEY_ID!,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
    region: config.S3_REGION,
    service: "s3",
  });
  const base = config.S3_ENDPOINT!.replace(/\/+$/, "");
  return {
    client: s3Client,
    // Path-style URLs work with every provider, including MinIO.
    objectUrl: (access, key) => {
      assertKey(key);
      return `${base}/${encodeURIComponent(config.S3_BUCKET!)}/${access}/${key}`;
    },
  };
}

async function s3Fail(response: Response, action: string): Promise<never> {
  // The response body may echo the request; keep only the status in errors.
  await response.body?.cancel();
  throw new Error(`object storage ${action} failed with HTTP ${response.status}`);
}

const s3Driver: StorageDriver = {
  async put(access, key, data, contentType) {
    const { client, objectUrl } = s3();
    const response = await client.fetch(objectUrl(access, key), {
      method: "PUT",
      body: new Uint8Array(data),
      headers: {
        "content-type": contentType,
        // Conditional write: refuse to overwrite an existing object.
        "if-none-match": "*",
      },
    });
    if (!response.ok) await s3Fail(response, "upload");
  },
  async get(access, key) {
    const { client, objectUrl } = s3();
    const response = await client.fetch(objectUrl(access, key));
    if (response.status === 404) {
      await response.body?.cancel();
      return null;
    }
    if (!response.ok) await s3Fail(response, "download");
    return Buffer.from(await response.arrayBuffer());
  },
  async exists(access, key) {
    const { client, objectUrl } = s3();
    const response = await client.fetch(objectUrl(access, key), { method: "HEAD" });
    return response.ok;
  },
  async move(from, to, key) {
    // Copy then delete; files are small, so a read and write is simplest and portable.
    const data = await s3Driver.get(from, key);
    if (!data) throw new Error("object storage move: source missing");
    const type = key.endsWith(".pdf") ? "application/pdf" : "image/webp";
    await s3Driver.put(to, key, data, type);
    await s3Driver.remove(from, key);
  },
  async remove(access, key) {
    const { client, objectUrl } = s3();
    const response = await client.fetch(objectUrl(access, key), { method: "DELETE" });
    if (!response.ok && response.status !== 404) await s3Fail(response, "delete");
    await response.body?.cancel();
  },
};

function driver(): StorageDriver {
  return env().STORAGE_DRIVER === "s3" ? s3Driver : localDriver;
}

// ---------------------------------------------------------------- public API (unchanged for callers)

export function putFile(access: Access, key: string, data: Uint8Array): Promise<void> {
  return driver().put(access, key, data, key.endsWith(".pdf") ? "application/pdf" : "image/webp");
}

export function readStoredFile(access: Access, key: string): Promise<Buffer | null> {
  return driver().get(access, key);
}

export function fileExists(access: Access, key: string): Promise<boolean> {
  return driver().exists(access, key);
}

export function moveFile(from: Access, to: Access, key: string): Promise<void> {
  return driver().move(from, to, key);
}

export function removeFile(access: Access, key: string): Promise<void> {
  return driver().remove(access, key);
}
