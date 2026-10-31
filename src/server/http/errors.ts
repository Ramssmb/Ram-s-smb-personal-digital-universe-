import { ZodError } from "zod";

/** Error codes from docs/API_DESIGN.md §1. */
export type ErrorCode =
  | "validation_failed"
  | "unauthenticated"
  | "forbidden"
  | "csrf_rejected"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "unsupported_media_type"
  | "rate_limited"
  | "unavailable"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  csrf_rejected: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  unavailable: 503,
  internal_error: 500,
};

const DEFAULT_MESSAGE: Record<ErrorCode, string> = {
  validation_failed: "Some fields are invalid.",
  unauthenticated: "Sign in to continue.",
  forbidden: "You do not have permission to do that.",
  csrf_rejected: "The request origin was rejected.",
  not_found: "Not found.",
  conflict: "The request conflicts with the current state.",
  payload_too_large: "The request is too large.",
  unsupported_media_type: "This file type is not supported.",
  rate_limited: "Too many requests. Try again later.",
  unavailable: "The service is temporarily unavailable.",
  internal_error: "Something went wrong.",
};

/** An error that is safe to show to the client as-is. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string = DEFAULT_MESSAGE[code],
    readonly fields?: Record<string, string>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
}

/** First message per field path, e.g. `{ "links.0.url": "Invalid URL" }`. */
export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Maps any thrown value to a client-safe error. Unknown errors become a generic
 * 500: the message, stack and cause never leave the server.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    return new AppError("validation_failed", undefined, zodFields(error));
  }
  return new AppError("internal_error");
}

export function errorBody(error: AppError, requestId: string): ErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
      requestId,
    },
  };
}
