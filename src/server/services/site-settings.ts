import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db/client";
import { siteSettings } from "@/server/db/schema";

export interface SiteSettings {
  siteName: string | null;
  titleTemplate: string;
  defaultDescription: string | null;
  defaultTheme: "system" | "light" | "dark";
}

/** Used until the owner saves settings for the first time. Contains no personal data. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: null,
  titleTemplate: "%s",
  defaultDescription: null,
  defaultTheme: "system",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const [row] = await db()
    .select({
      siteName: siteSettings.siteName,
      titleTemplate: siteSettings.titleTemplate,
      defaultDescription: siteSettings.defaultDescription,
      defaultTheme: siteSettings.defaultTheme,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  return row ?? DEFAULT_SITE_SETTINGS;
}
