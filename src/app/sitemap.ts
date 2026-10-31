import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/server/content/public";
import { absoluteUrl } from "@/server/seo";

export const dynamic = "force-dynamic";

const STATIC_PAGES = [
  "/",
  "/about",
  "/education",
  "/skills",
  "/projects",
  "/experience",
  "/achievements",
  "/journal",
  "/resources",
  "/links",
  "/contact",
];

/** Public pages plus every published, public project and journal entry. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects, journal } = await sitemapEntries();
  return [
    ...STATIC_PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...projects.map((p) => ({
      url: absoluteUrl(`/projects/${p.slug}`),
      lastModified: p.updatedAt,
    })),
    ...journal.map((j) => ({ url: absoluteUrl(`/journal/${j.slug}`), lastModified: j.updatedAt })),
  ];
}
