import type { MetadataRoute } from "next";

import { sitemapEntries, sitemapSections } from "@/server/content/public";
import { absoluteUrl } from "@/server/seo";

export const dynamic = "force-dynamic";

/**
 * Section pages that have published content, plus every published, public
 * project and journal entry. Empty sections are left out until they have content.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sections, { projects, journal }] = await Promise.all([
    sitemapSections(),
    sitemapEntries(),
  ]);
  return [
    ...sections.map(({ path, lastModified }) => ({
      url: absoluteUrl(path),
      ...(lastModified ? { lastModified } : {}),
    })),
    ...projects.map((p) => ({
      url: absoluteUrl(`/projects/${p.slug}`),
      lastModified: p.updatedAt,
    })),
    ...journal.map((j) => ({ url: absoluteUrl(`/journal/${j.slug}`), lastModified: j.updatedAt })),
  ];
}
