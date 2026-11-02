import "server-only";

import type { Metadata } from "next";

import type { SeoPageKey } from "@/lib/content/enums";
import { getIdentity, type PublicImage } from "@/server/content/public";
import { env } from "@/server/env";

/** Link-preview images are served as 1200 × 630 JPEG (src/app/media/og). */
export const SHARE_IMAGE = { width: 1200, height: 630 } as const;

/** `/media/<key>` → `/media/og/<key>.jpg`, the JPEG preview of a public image. */
export function shareImageUrl(image: Pick<PublicImage, "src">): string {
  return `${image.src.replace(/^\/media\//, "/media/og/")}.jpg`;
}

export const FEED_PATH = "/journal/feed.xml";

/**
 * Open Graph, X (Twitter) and link tags for one page. Next.js replaces — does
 * not merge — a parent's `openGraph`, `twitter` and `alternates` when a page
 * sets them, so every page builds the complete set here: site name, type,
 * canonical URL, the RSS link and an image (the page's own, else the default
 * sharing image from Settings).
 */
export async function socialMetadata(options: {
  title: string;
  description?: string;
  path: string;
  type?: "website" | "article";
  image?: PublicImage | null;
  publishedTime?: string;
  modifiedTime?: string;
}): Promise<Pick<Metadata, "openGraph" | "twitter" | "alternates">> {
  const { siteName, ogImage } = await getIdentity();
  const image = options.image ?? ogImage;
  const images = image
    ? [{ url: shareImageUrl(image), ...SHARE_IMAGE, alt: image.alt, type: "image/jpeg" }]
    : undefined;
  const common = { title: options.title, description: options.description };
  return {
    alternates: {
      canonical: options.path,
      types: {
        "application/rss+xml": [
          { url: FEED_PATH, title: `${siteName ?? "Personal site"} — Journal` },
        ],
      },
    },
    openGraph:
      options.type === "article"
        ? {
            ...common,
            type: "article",
            url: options.path,
            siteName: siteName ?? undefined,
            images,
            publishedTime: options.publishedTime,
            modifiedTime: options.modifiedTime,
          }
        : {
            ...common,
            type: "website",
            url: options.path,
            siteName: siteName ?? undefined,
            images,
          },
    twitter: {
      ...common,
      card: image ? "summary_large_image" : "summary",
      images: images?.map(({ url, alt }) => ({ url, alt })),
    },
  };
}

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
    ...(await socialMetadata({ title, description, path })),
  };
}

export function absoluteUrl(path: string): string {
  return `${env().SITE_URL}${path}`;
}
