"use client";

/** Error returned by the API, with per-field messages when validation failed. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; json?: unknown; body?: FormData } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (options.json !== undefined || options.body ? "POST" : "GET"),
      headers: options.json !== undefined ? { "content-type": "application/json" } : undefined,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", 0, "network");
  }
  if (response.status === 401 && typeof window !== "undefined" && !path.includes("/auth/login")) {
    // Outside React (no router here): a full navigation also drops any stale client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(
      error?.message ?? "Something went wrong.",
      response.status,
      error?.code ?? "unknown",
      error?.fields ?? {},
    );
  }
  return body as T;
}
