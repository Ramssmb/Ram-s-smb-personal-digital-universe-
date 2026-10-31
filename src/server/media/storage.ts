import "server-only";

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { env } from "@/server/env";

export type Access = "public" | "private";

const KEY_PATTERN = /^\d{4}\/\d{2}\/[0-9a-f-]{36}(?:-\d{2,4})?\.(?:webp|pdf)$/;

/** Local-disk storage. Public and private files live in separate folders. */
function root(access: Access): string {
  return resolve(env().STORAGE_DIR, access);
}

/** Resolves a key inside its folder, refusing anything that could escape it. */
export function pathFor(access: Access, key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error("invalid storage key");
  const base = root(access);
  const full = resolve(base, key);
  if (!full.startsWith(base + sep)) throw new Error("invalid storage key");
  return full;
}

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export async function putFile(access: Access, key: string, data: Uint8Array): Promise<void> {
  const path = pathFor(access, key);
  await mkdir(dirname(path), { recursive: true });
  // `wx` refuses to overwrite: keys are random and must never collide silently.
  await writeFile(path, data, { flag: "wx" });
}

export async function readStoredFile(access: Access, key: string): Promise<Buffer | null> {
  try {
    return await readFile(pathFor(access, key));
  } catch {
    return null;
  }
}

export async function fileExists(access: Access, key: string): Promise<boolean> {
  try {
    return (await stat(pathFor(access, key))).isFile();
  } catch {
    return false;
  }
}

export async function moveFile(from: Access, to: Access, key: string): Promise<void> {
  const target = pathFor(to, key);
  await mkdir(dirname(target), { recursive: true });
  await rename(pathFor(from, key), target);
}

export async function removeFile(access: Access, key: string): Promise<void> {
  await rm(pathFor(access, key), { force: true });
}
