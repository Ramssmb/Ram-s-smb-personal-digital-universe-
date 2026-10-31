/**
 * Identifies an upload by its leading bytes (docs/AUTH_AND_SECURITY.md §8).
 * The file name and the browser-supplied type are never trusted. SVG is
 * deliberately not supported: it can carry scripts.
 */
export type SniffedType =
  | { kind: "image"; mime: "image/jpeg" | "image/png" | "image/webp" | "image/avif" }
  | { kind: "document"; mime: "application/pdf" };

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

export function sniff(bytes: Uint8Array): SniffedType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { kind: "image", mime: "image/jpeg" };
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return { kind: "image", mime: "image/png" };
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    return { kind: "image", mime: "image/webp" };
  if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) {
    return { kind: "image", mime: "image/avif" };
  }
  if (ascii(bytes, 0, 5) === "%PDF-") return { kind: "document", mime: "application/pdf" };
  return null;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
