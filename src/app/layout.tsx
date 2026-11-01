import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { THEME_COOKIE, parseThemePreference, themeAttribute } from "@/lib/theme";
import { getIdentity } from "@/server/content/public";
import { env } from "@/server/env";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Only small labels and dates use the monospace face: load it when needed rather
// than preloading it alongside the page's main content.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
});

// Every page is rendered per request: the CSP nonce and the theme cookie differ
// per visitor (ARCHITECTURE.md D10). This also keeps `next build` from querying
// the database.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { settings, siteName, ogImage } = await getIdentity();
  const name = siteName ?? "Personal site";
  return {
    metadataBase: new URL(env().SITE_URL),
    title: { default: name, template: settings.titleTemplate ?? "%s" },
    description: settings.defaultDescription ?? undefined,
    applicationName: name,
    openGraph: {
      type: "website",
      siteName: name,
      ...(ogImage
        ? {
            images: [
              { url: ogImage.src, width: ogImage.width, height: ogImage.height, alt: ogImage.alt },
            ],
          }
        : {}),
    },
    twitter: { card: ogImage ? "summary_large_image" : "summary" },
    alternates: {
      types: { "application/rss+xml": [{ url: "/journal/feed.xml", title: `${name} — Journal` }] },
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
    <html
      lang="en"
      data-theme={themeAttribute(preference)}
      className={`${inter.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
