import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/server/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/search"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
