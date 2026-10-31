import "server-only";

import { AppError } from "./errors";

const MAX_JSON_BYTES = 256 * 1024;

/** Parses a JSON body with a size cap. Invalid JSON is a validation error, not a 500. */
export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new AppError("unsupported_media_type", "Send the request body as JSON.");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_JSON_BYTES) throw new AppError("payload_too_large");
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new AppError("payload_too_large");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("validation_failed", "The request body is not valid JSON.");
  }
}
