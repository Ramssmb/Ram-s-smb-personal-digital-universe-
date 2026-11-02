"use client";

import { api, ApiError } from "./api";
import type { MediaSummary } from "./media-picker";

type Target = { mediaId: string } | { access: "public" | "private"; altText: string };

type StartResponse =
  { mode: "form" } | { mode: "direct"; id: string; url: string; headers: Record<string, string> };

/**
 * Uploads a new file or replaces a media item's file. The server decides how:
 * in "form" mode the file is posted to the app (multipart, as always); in
 * "direct" mode it goes straight to object storage with a signed URL and the
 * app then validates and processes it (docs/VERCEL_ARCHITECTURE.md §5).
 */
export async function sendFile(file: File, target: Target): Promise<MediaSummary> {
  const start = await api<StartResponse>("/api/v1/admin/media/uploads", {
    json: { filename: file.name || "upload", size: file.size, contentType: file.type, ...target },
  });

  if (start.mode === "form") {
    const body = new FormData();
    body.set("file", file);
    if ("mediaId" in target) {
      const { item } = await api<{ item: MediaSummary }>(
        `/api/v1/admin/media/${target.mediaId}/file`,
        { method: "PUT", body },
      );
      return item;
    }
    body.set("access", target.access);
    body.set("altText", target.altText);
    const { item } = await api<{ item: MediaSummary }>("/api/v1/admin/media", { body });
    return item;
  }

  let stored: Response;
  try {
    stored = await fetch(start.url, { method: "PUT", headers: start.headers, body: file });
  } catch {
    throw new ApiError("Could not reach file storage. Check your connection.", 0, "network");
  }
  if (!stored.ok) {
    throw new ApiError("File storage refused the upload. Try again.", stored.status, "storage");
  }
  const { item } = await api<{ item: MediaSummary }>(
    `/api/v1/admin/media/uploads/${start.id}/complete`,
    { method: "POST" },
  );
  return item;
}
