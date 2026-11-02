import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { THEME_COOKIE, parseThemePreference, themeAttribute } from "@/lib/theme";
import { getIdentity } from "@/server/content/public";
import { env } from "@/server/env";
import { FEED_PATH, SHARE_IMAGE, shareImageUrl } from "@/server/seo";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Every page is rendered per request: the CSP nonce and the theme cookie differ
// per visitor (ARCHITECTURE.md D10). This also keeps `next build` from querying
// the database.
export const dynamic = "force-dynamic";

// Pages that set their own social metadata use socialMetadata() (src/server/seo.ts),
// because Next.js replaces these objects instead of merging them. This is the
// fallback for pages that do not (search, 404).
export async function generateMetadata(): Promise<Metadata> {
  const { settings, siteName, ogImage } = await getIdentity();
  const name = siteName ?? "Personal site";
  const image = ogImage
    ? [{ url: shareImageUrl(ogImage), ...SHARE_IMAGE, alt: ogImage.alt, type: "image/jpeg" }]
    : undefined;
  return {
    metadataBase: new URL(env().SITE_URL),
    // The stored default is a bare "%s": until a template with more than that is
    // saved in Settings, page titles still carry the site name.
    title: {
      default: name,
      template:
        settings.titleTemplate && settings.titleTemplate !== "%s"
          ? settings.titleTemplate
          : siteName
            ? `%s · ${name}`
            : "%s",
    },
    description: settings.defaultDescription ?? undefined,
    applicationName: name,
    openGraph: { type: "website", siteName: name, images: image },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      images: image?.map(({ url, alt }) => ({ url, alt })),
    },
    alternates: {
      types: { "application/rss+xml": [{ url: FEED_PATH, title: `${name} — Journal` }] },
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const { settings } = await getIdentity();
  const preference =
    parseThemePreference(cookieStore.get(THEME_COOKIE)?.value) ?? settings.defaultTheme ?? "system";

  return (
    <html lang="en" data-theme={themeAttribute(preference)} className={inter.variable}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
