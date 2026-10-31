import "server-only";

import { eq, inArray } from "drizzle-orm";

import { SEO_PAGE_KEYS, type SeoPageKey } from "@/lib/content/enums";
import { buildSchema } from "@/lib/content/fields";
import { PROFILE_FIELDS, SEO_PAGE_FIELDS, SETTINGS_FIELDS } from "@/lib/content/singletons";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { mediaAssets, profile, seoPages, siteSettings } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { audit } from "@/server/services/audit";

export type ProfileRow = typeof profile.$inferSelect;
export type SettingsRow = typeof siteSettings.$inferSelect;

const EMPTY_PROFILE: Omit<ProfileRow, "createdAt" | "updatedAt"> = {
  id: 1,
  displayName: null,
  headline: null,
  shortBio: null,
  photoId: null,
  location: null,
  currentFocus: null,
  interests: [],
  availability: null,
};

export async function getProfile(): Promise<
  Omit<ProfileRow, "createdAt" | "updatedAt"> & { updatedAt?: Date }
> {
  const [row] = await db().select().from(profile).where(eq(profile.id, 1));
  return row ?? EMPTY_PROFILE;
}

export async function getSettingsRow(): Promise<Partial<SettingsRow>> {
  const [row] = await db().select().from(siteSettings).where(eq(siteSettings.id, 1));
  return (
    row ?? {
      siteName: null,
      titleTemplate: "%s",
      defaultDescription: null,
      defaultTheme: "system",
      ogImageId: null,
      contactEnabled: true,
      publicEmail: null,
      homeShowEducation: true,
      homeShowProjects: true,
      homeShowSkills: true,
      homeShowJournal: true,
      homeShowAchievements: true,
    }
  );
}

async function assertImage(id: unknown, field: string): Promise<void> {
  if (typeof id !== "string") return;
  const [file] = await db()
    .select({ kind: mediaAssets.kind, access: mediaAssets.access, alt: mediaAssets.altText })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id));
  if (!file || file.kind !== "image") {
    throw new AppError("validation_failed", undefined, {
      [field]: "Choose an image from the media library.",
    });
  }
  if (file.access !== "public") {
    throw new AppError("validation_failed", undefined, {
      [field]: "This image is private; choose a public one.",
    });
  }
  if (!file.alt.trim()) {
    throw new AppError("validation_failed", undefined, {
      [field]: "Add alt text to this image first.",
    });
  }
}

export async function saveProfile(input: unknown, admin: SessionUser) {
  const data = buildSchema(PROFILE_FIELDS).parse(input);
  await assertImage(data.photoId, "photoId");
  const now = new Date();
  await db()
    .insert(profile)
    .values({ id: 1, ...data, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: profile.id, set: { ...data, updatedAt: now } });
  await audit({
    userId: admin.id,
    action: "update",
    entityType: "profile",
    summary: { fields: Object.keys(data) },
  });
  return getProfile();
}

export async function saveSettings(input: unknown, admin: SessionUser) {
  const data = buildSchema(SETTINGS_FIELDS).parse(input);
  if (typeof data.titleTemplate !== "string" || !data.titleTemplate.includes("%s")) {
    throw new AppError("validation_failed", undefined, {
      titleTemplate: "Include %s where the page title goes.",
    });
  }
  await assertImage(data.ogImageId, "ogImageId");
  const now = new Date();
  await db()
    .insert(siteSettings)
    .values({ id: 1, ...data, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: siteSettings.id, set: { ...data, updatedAt: now } });
  await audit({
    userId: admin.id,
    action: "update",
    entityType: "settings",
    summary: { fields: Object.keys(data) },
  });
  return getSettingsRow();
}

export async function getSeoPages(): Promise<
  Record<SeoPageKey, { title: string | null; description: string | null }>
> {
  const rows = await db()
    .select()
    .from(seoPages)
    .where(inArray(seoPages.key, [...SEO_PAGE_KEYS]));
  const result = {} as Record<SeoPageKey, { title: string | null; description: string | null }>;
  for (const key of SEO_PAGE_KEYS) {
    const row = rows.find((r) => r.key === key);
    result[key] = { title: row?.title ?? null, description: row?.description ?? null };
  }
  return result;
}

export async function saveSeoPage(key: string, input: unknown, admin: SessionUser) {
  if (!(SEO_PAGE_KEYS as readonly string[]).includes(key)) throw new AppError("not_found");
  const data = buildSchema(SEO_PAGE_FIELDS).parse(input) as {
    title?: string | null;
    description?: string | null;
  };
  const values = {
    title: data.title ?? null,
    description: data.description || null,
    updatedAt: new Date(),
  };
  await db()
    .insert(seoPages)
    .values({ key, ...values, createdAt: new Date() })
    .onConflictDoUpdate({ target: seoPages.key, set: values });
  await audit({ userId: admin.id, action: "update", entityType: "seo", entityId: key });
}
