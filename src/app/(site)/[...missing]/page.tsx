import { notFound } from "next/navigation";

/**
 * Unknown public URLs. Without this catch-all, Next.js answers them with the
 * root 404, which has no site header; routing them here renders
 * (site)/not-found.tsx inside the site layout instead. Every real route is more
 * specific and wins over it.
 */
export default function MissingPage(): never {
  notFound();
}
