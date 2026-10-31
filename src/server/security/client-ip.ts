import "server-only";

import { env } from "@/server/env";

import { keyedHash } from "./crypto";

/**
 * The client address, taken from X-Forwarded-For only when trusted proxies are
 * configured: with N trusted hops, the Nth address from the right is the one
 * the outermost trusted proxy saw. Without proxies Next.js route handlers do not
 * expose the socket address, so all clients share one bucket ("unknown").
 */
export function clientIp(headers: Headers, trustedHops = env().TRUST_PROXY_HOPS): string {
  if (trustedHops > 0) {
    const chain = (headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const candidate = chain[chain.length - trustedHops];
    if (candidate && /^[0-9a-fA-F:.]{2,45}$/.test(candidate)) return candidate;
  }
  return "unknown";
}

/** Stored instead of the raw address (docs/AUTH_AND_SECURITY.md §13). */
export function clientIpHash(headers: Headers): string {
  return keyedHash("ip", clientIp(headers));
}
