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

const MAILTO = /^mailto:([^\s@?&#/:]+@[^\s@?&#/:]+\.[^\s@?&#/:]+)$/i;

/**
 * Accepts only `mailto:address` with a plausible address and nothing else:
 * query parts such as ?cc= or ?body= are rejected so a link cannot add
 * recipients or pre-filled text. Returns the normalized link or null.
 */
export function safeMailto(value: string | null | undefined): string | null {
  const match = value ? MAILTO.exec(value.trim()) : null;
  return match ? `mailto:${match[1]!.toLowerCase()}` : null;
}
