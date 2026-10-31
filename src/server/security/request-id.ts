export const REQUEST_ID_HEADER = "x-request-id";

// Accept an upstream id (e.g. from the reverse proxy) only if it is short and
// plain, so it cannot inject anything into logs or headers.
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

export function resolveRequestId(incoming: string | null): string {
  return incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
}
