import "server-only";

import { isCollectionKey, type CollectionKey } from "@/lib/content/collections";

import { AppError } from "./errors";

export function param(params: Record<string, string | string[]>, name: string): string {
  const value = params[name];
  if (typeof value !== "string" || !value) throw new AppError("not_found");
  return value;
}

export function collectionParam(params: Record<string, string | string[]>): CollectionKey {
  const value = param(params, "collection");
  if (!isCollectionKey(value)) throw new AppError("not_found");
  return value;
}

export function intParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
