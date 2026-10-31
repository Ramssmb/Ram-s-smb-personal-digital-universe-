import { readStoredFile, isValidKey } from "@/server/media/storage";

/**
 * Public files only. Keys are random and content never changes for a key, so
 * responses are cached forever. Private files are not reachable here: they
 * live in a different folder.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = (await params).path.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });
  const data = await readStoredFile("public", key);
  if (!data) return new Response("Not found", { status: 404 });
  const pdf = key.endsWith(".pdf");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": pdf ? "application/pdf" : "image/webp",
      "content-length": String(data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      // A PDF opened in the browser cannot run script against this site.
      ...(pdf ? { "content-security-policy": "sandbox" } : {}),
    },
  });
}
