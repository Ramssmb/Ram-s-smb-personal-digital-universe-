/**
 * Accepts only absolute http(s) URLs without embedded credentials
 * (docs/AUTH_AND_SECURITY.md §9). Rejects `javascript:`, `data:`, relative and
 * malformed values. Returns the normalized URL or null.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  return url.toString();
}
