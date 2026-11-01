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

// Multipart overhead on top of the 15 MB file limit.
const MAX_UPLOAD_REQUEST_BYTES = 16 * 1024 * 1024;

/** Reads a multipart upload, rejecting oversized or non-multipart requests before parsing. */
export async function readUploadForm(request: Request): Promise<{ file: File; form: FormData }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_REQUEST_BYTES) {
    throw new AppError("payload_too_large", "Files can be at most 15 MB.");
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    throw new AppError("unsupported_media_type", "Upload files as multipart form data.");
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("validation_failed", "Choose a file to upload.");
  return { file, form };
}
