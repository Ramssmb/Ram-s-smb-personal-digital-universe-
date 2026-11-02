import { NextResponse, type NextRequest } from "next/server";

import { contentSecurityPolicy, createNonce, directUploadOrigin } from "@/server/security/headers";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/server/security/request-id";

/**
 * Runs before every page and API request. It sets the per-request CSP nonce and
 * the request id. It is NOT an authorization boundary: admin access is checked
 * inside each handler and page (docs/AUTH_AND_SECURITY.md §3).
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
    directUploadOrigin(),
  );
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));

  const requestHeaders = new Headers(request.headers);
  // Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
  requestHeaders.set("content-security-policy", csp);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  // The dashboard and the API are never indexed: a header covers JSON and
  // redirects too, in addition to robots.txt and the pages' robots meta tag.
  if (/^\/(admin|api)(\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    // Skip static build assets and image optimizer output; they carry no HTML.
    { source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)" },
  ],
};
