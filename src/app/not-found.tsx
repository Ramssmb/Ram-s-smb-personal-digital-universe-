import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

/** 404 outside the public site (for example under /admin), without the site header. */
export default function NotFound() {
  return <NotFoundContent />;
}
