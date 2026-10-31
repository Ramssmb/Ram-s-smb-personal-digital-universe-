import "server-only";

import type { Metadata } from "next";

import type { SeoPageKey } from "@/lib/content/enums";
import { getIdentity } from "@/server/content/public";
import { env } from "@/server/env";

/**
 * Metadata for a fixed public page: owner overrides from Settings → SEO win,
 * then the given defaults. Every page gets a canonical URL.
 */
export async function pageMetadata(
  key: SeoPageKey,
  path: string,
  defaults: { title: string; description?: string },
): Promise<Metadata> {
  const { seo, settings } = await getIdentity();
  const override = seo[key];
  const title = override.title || defaults.title;
  const description =
    override.description || defaults.description || settings.defaultDescription || undefined;
  return {
    title: key === "home" ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export function absoluteUrl(path: string): string {
  return `${env().SITE_URL}${path}`;
}
