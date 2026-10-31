import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader, SkipLink } from "@/components/site/site-header";
import { primaryNav } from "@/config/navigation";
import { THEME_COOKIE, parseThemePreference, themeAttribute } from "@/lib/theme";
import { env } from "@/server/env";
import { getSiteSettings } from "@/server/services/site-settings";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Every page is rendered per request: the CSP nonce and the theme cookie differ
// per visitor. Content is cached at the data layer instead (ARCHITECTURE.md D10).
// This also keeps `next build` from querying the database.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(env().SITE_URL),
    title: {
      default: settings.siteName ?? "Home",
      template: settings.titleTemplate,
    },
    description: settings.defaultDescription ?? undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [settings, cookieStore] = await Promise.all([getSiteSettings(), cookies()]);
  const preference =
    parseThemePreference(cookieStore.get(THEME_COOKIE)?.value) ?? settings.defaultTheme;

  return (
    <html
      lang="en"
      data-theme={themeAttribute(preference)}
      className={`${inter.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <SiteHeader siteName={settings.siteName} nav={primaryNav} />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter siteName={settings.siteName} />
      </body>
    </html>
  );
}
