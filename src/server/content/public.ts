import "server-only";

import { and, asc, count, desc, eq, gt, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { cache } from "react";

import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";

import { getProfile, getSeoPages, getSettingsRow } from "./singletons";

/**
 * Read side for visitors. Every query here applies the visibility rule:
 * a row is public only when status = 'published' AND visibility = 'public'
 * (docs/DATABASE_DESIGN.md §2). Nothing in this file returns drafts.
 */
export function live(t: { status: AnyPgColumn; visibility: AnyPgColumn }): SQL {
  return and(eq(t.status, "published"), eq(t.visibility, "public"))!;
}

// ---------------------------------------------------------------- media

export interface PublicImage {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  srcSet: string;
}

export interface PublicFile {
  id: string;
  href: string;
  kind: "image" | "document";
  name: string;
}

/** Loads public files by id. Private files are silently left out. */
export async function publicMedia(
  ids: (string | null | undefined)[],
): Promise<Map<string, PublicImage & PublicFile>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const result = new Map<string, PublicImage & PublicFile>();
  if (!wanted.length) return result;
  const rows = await db()
    .select()
    .from(s.mediaAssets)
    .where(and(inArray(s.mediaAssets.id, wanted), eq(s.mediaAssets.access, "public")));
  for (const row of rows) {
    const src = `/media/${row.storageKey}`;
    const srcSet = [
      ...row.variants.map((v) => `/media/${v.key} ${v.width}w`),
      `${src} ${row.width ?? 0}w`,
    ].join(", ");
    result.set(row.id, {
      id: row.id,
      src,
      href: src,
      width: row.width ?? 0,
      height: row.height ?? 0,
      alt: row.altText,
      srcSet,
      kind: row.kind as "image" | "document",
      name: row.originalFilename,
    });
  }
  return result;
}

async function namesFor(
  joinTable:
    | typeof s.projectSkills
    | typeof s.experienceSkills
    | typeof s.certificationSkills
    | typeof s.journalSkills,
  ownColumn: AnyPgColumn,
  skillColumn: AnyPgColumn,
  ids: string[],
): Promise<Map<string, { name: string; slug: string }[]>> {
  const map = new Map<string, { name: string; slug: string }[]>();
  if (!ids.length) return map;
  const rows = await db()
    .select({ owner: ownColumn, name: s.skills.name, slug: s.skills.slug })
    .from(joinTable)
    .innerJoin(s.skills, eq(s.skills.id, skillColumn))
    .where(and(inArray(ownColumn, ids), live(s.skills)))
    .orderBy(asc(s.skills.name));
  for (const row of rows) {
    const list = map.get(row.owner as string) ?? [];
    list.push({ name: row.name, slug: row.slug });
    map.set(row.owner as string, list);
  }
  return map;
}

async function tagsFor(
  joinTable: typeof s.projectTags | typeof s.journalTags | typeof s.resourceTags,
  ownColumn: AnyPgColumn,
  tagColumn: AnyPgColumn,
  ids: string[],
): Promise<Map<string, { name: string; slug: string }[]>> {
  const map = new Map<string, { name: string; slug: string }[]>();
  if (!ids.length) return map;
  const rows = await db()
    .select({ owner: ownColumn, name: s.tags.name, slug: s.tags.slug })
    .from(joinTable)
    .innerJoin(s.tags, eq(s.tags.id, tagColumn))
    .where(inArray(ownColumn, ids))
    .orderBy(asc(s.tags.name));
  for (const row of rows) {
    const list = map.get(row.owner as string) ?? [];
    list.push({ name: row.name, slug: row.slug });
    map.set(row.owner as string, list);
  }
  return map;
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** Full-text match on the generated search column, with a title substring fallback. */
function textMatch(search: AnyPgColumn, title: AnyPgColumn, q: string): SQL {
  return or(
    sql`${search} @@ websearch_to_tsquery('english', ${q})`,
    sql`${title} ILIKE ${likePattern(q)}`,
  )!;
}

// ---------------------------------------------------------------- identity

export const getIdentity = cache(async () => {
  const [settings, profile, seo] = await Promise.all([
    getSettingsRow(),
    getProfile(),
    getSeoPages(),
  ]);
  const media = await publicMedia([profile.photoId, settings.ogImageId]);
  return {
    settings,
    profile,
    seo,
    siteName: settings.siteName || profile.displayName || null,
    photo: profile.photoId ? (media.get(profile.photoId) ?? null) : null,
    ogImage: settings.ogImageId ? (media.get(settings.ogImageId) ?? null) : null,
  };
});

export const getFeaturedLinks = cache(async () =>
  db()
    .select({
      id: s.links.id,
      label: s.links.label,
      url: s.links.url,
      icon: s.links.icon,
      relMe: s.links.relMe,
    })
    .from(s.links)
    .where(and(live(s.links), eq(s.links.isFeatured, true)))
    .orderBy(asc(s.links.sortOrder)),
);

/** Web profiles the owner marked as theirs (rel="me"); used as schema.org `sameAs`. */
export async function getIdentityProfileUrls(): Promise<string[]> {
  const rows = await db()
    .select({ url: s.links.url })
    .from(s.links)
    .where(and(live(s.links), eq(s.links.relMe, true)))
    .orderBy(asc(s.links.sortOrder));
  return rows.map((r) => r.url).filter((url) => /^https?:\/\//i.test(url));
}

export async function listLinks() {
  return db()
    .select()
    .from(s.links)
    .where(live(s.links))
    .orderBy(asc(s.links.sortOrder), asc(s.links.label));
}

// ---------------------------------------------------------------- about & education

export async function listAboutSections() {
  return db()
    .select({
      id: s.aboutSections.id,
      title: s.aboutSections.title,
      bodyMd: s.aboutSections.bodyMd,
    })
    .from(s.aboutSections)
    .where(live(s.aboutSections))
    .orderBy(asc(s.aboutSections.sortOrder));
}

export async function listEducation() {
  return db()
    .select()
    .from(s.education)
    .where(live(s.education))
    .orderBy(asc(s.education.sortOrder), desc(s.education.startYear));
}

// ---------------------------------------------------------------- skills

export async function listCategories(scope: "skill" | "project" | "resource") {
  return db()
    .select({ id: s.categories.id, name: s.categories.name, slug: s.categories.slug })
    .from(s.categories)
    .where(eq(s.categories.scope, scope))
    .orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
}

export async function listSkills(
  filters: { q?: string; category?: string; featured?: boolean } = {},
) {
  const where: SQL[] = [live(s.skills)];
  if (filters.q) where.push(textMatch(s.skills.search, s.skills.name, filters.q));
  if (filters.category) where.push(eq(s.categories.slug, filters.category));
  if (filters.featured) where.push(eq(s.skills.isFeatured, true));
  return db()
    .select({
      id: s.skills.id,
      name: s.skills.name,
      slug: s.skills.slug,
      descriptionMd: s.skills.descriptionMd,
      learningStatus: s.skills.learningStatus,
      experienceLevel: s.skills.experienceLevel,
      lastReviewedOn: s.skills.lastReviewedOn,
      categoryName: s.categories.name,
      categorySlug: s.categories.slug,
      categoryOrder: s.categories.sortOrder,
    })
    .from(s.skills)
    .leftJoin(s.categories, eq(s.categories.id, s.skills.categoryId))
    .where(and(...where))
    .orderBy(
      sql`${s.categories.sortOrder} NULLS LAST`,
      asc(s.categories.name),
      asc(s.skills.sortOrder),
      asc(s.skills.name),
    );
}

/** Projects that use a skill, for the skills page. */
export async function projectsBySkill(skillIds: string[]) {
  const map = new Map<string, { title: string; slug: string }[]>();
  if (!skillIds.length) return map;
  const rows = await db()
    .select({ skillId: s.projectSkills.skillId, title: s.projects.title, slug: s.projects.slug })
    .from(s.projectSkills)
    .innerJoin(s.projects, eq(s.projects.id, s.projectSkills.projectId))
    .where(and(inArray(s.projectSkills.skillId, skillIds), live(s.projects)));
  for (const row of rows) {
    const list = map.get(row.skillId) ?? [];
    list.push({ title: row.title, slug: row.slug });
    map.set(row.skillId, list);
  }
  return map;
}

/** Published certifications and courses linked to each skill, for the skills page. */
export async function certificationsBySkill(skillIds: string[]) {
  const map = new Map<string, { id: string; title: string }[]>();
  if (!skillIds.length) return map;
  const rows = await db()
    .select({
      skillId: s.certificationSkills.skillId,
      id: s.certifications.id,
      title: s.certifications.title,
    })
    .from(s.certificationSkills)
    .innerJoin(s.certifications, eq(s.certifications.id, s.certificationSkills.certificationId))
    .where(and(inArray(s.certificationSkills.skillId, skillIds), live(s.certifications)))
    .orderBy(asc(s.certifications.title));
  for (const row of rows) {
    const list = map.get(row.skillId) ?? [];
    list.push({ id: row.id, title: row.title });
    map.set(row.skillId, list);
  }
  return map;
}

// ---------------------------------------------------------------- projects

export const PROJECT_SORTS = ["featured", "newest", "oldest", "title"] as const;
const PAGE_SIZE = 12;

export async function listProjects(
  filters: {
    q?: string;
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
    featured?: boolean;
    limit?: number;
  } = {},
) {
  const where: SQL[] = [live(s.projects)];
  if (filters.q) where.push(textMatch(s.projects.search, s.projects.title, filters.q));
  if (filters.category) where.push(eq(s.categories.slug, filters.category));
  if (filters.status) where.push(sql`${s.projects.projectStatus}::text = ${filters.status}`);
  if (filters.featured) where.push(eq(s.projects.isFeatured, true));
  const order =
    filters.sort === "newest"
      ? [sql`${s.projects.startedOn} DESC NULLS LAST`]
      : filters.sort === "oldest"
        ? [sql`${s.projects.startedOn} ASC NULLS LAST`]
        : filters.sort === "title"
          ? [asc(s.projects.title)]
          : [
              desc(s.projects.isFeatured),
              asc(s.projects.sortOrder),
              sql`${s.projects.startedOn} DESC NULLS LAST`,
            ];
  const limit = filters.limit ?? PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const base = db()
    .select({
      id: s.projects.id,
      slug: s.projects.slug,
      title: s.projects.title,
      summary: s.projects.summary,
      projectStatus: s.projects.projectStatus,
      startedOn: s.projects.startedOn,
      completedOn: s.projects.completedOn,
      coverMediaId: s.projects.coverMediaId,
      isFeatured: s.projects.isFeatured,
      repoUrl: s.projects.repoUrl,
      liveUrl: s.projects.liveUrl,
      categoryName: s.categories.name,
    })
    .from(s.projects)
    .leftJoin(s.categories, eq(s.categories.id, s.projects.categoryId))
    .where(and(...where));
  const [rows, [total]] = await Promise.all([
    base
      .orderBy(...order)
      .limit(limit)
      .offset((page - 1) * limit),
    db()
      .select({ value: count() })
      .from(s.projects)
      .leftJoin(s.categories, eq(s.categories.id, s.projects.categoryId))
      .where(and(...where)),
  ]);
  const ids = rows.map((r) => r.id);
  const [skillMap, media] = await Promise.all([
    namesFor(s.projectSkills, s.projectSkills.projectId, s.projectSkills.skillId, ids),
    publicMedia(rows.map((r) => r.coverMediaId)),
  ]);
  return {
    items: rows.map((row) => ({
      ...row,
      skills: skillMap.get(row.id) ?? [],
      cover: row.coverMediaId ? (media.get(row.coverMediaId) ?? null) : null,
    })),
    total: Number(total?.value ?? 0),
    page,
    pageSize: limit,
  };
}

async function projectDetail(where: SQL) {
  const [row] = await db()
    .select({ project: s.projects, categoryName: s.categories.name })
    .from(s.projects)
    .leftJoin(s.categories, eq(s.categories.id, s.projects.categoryId))
    .where(where)
    .limit(1);
  if (!row) return null;
  const project = row.project;
  const screenshots = await db()
    .select({ mediaId: s.projectMedia.mediaId })
    .from(s.projectMedia)
    .where(eq(s.projectMedia.projectId, project.id))
    .orderBy(asc(s.projectMedia.sortOrder));
  const [skillMap, tagMap, media] = await Promise.all([
    namesFor(s.projectSkills, s.projectSkills.projectId, s.projectSkills.skillId, [project.id]),
    tagsFor(s.projectTags, s.projectTags.projectId, s.projectTags.tagId, [project.id]),
    publicMedia([project.coverMediaId, ...screenshots.map((m) => m.mediaId)]),
  ]);
  return {
    ...project,
    categoryName: row.categoryName,
    skills: skillMap.get(project.id) ?? [],
    tags: tagMap.get(project.id) ?? [],
    cover: project.coverMediaId ? (media.get(project.coverMediaId) ?? null) : null,
    screenshots: screenshots.map((m) => media.get(m.mediaId)).filter((m) => m !== undefined),
  };
}

export async function getProject(slug: string) {
  return projectDetail(and(eq(s.projects.slug, slug), live(s.projects))!);
}

/** Admin preview only: ignores the visibility rule. Callers must check the admin session. */
export async function getProjectForPreview(id: string) {
  return projectDetail(eq(s.projects.id, id));
}

// ---------------------------------------------------------------- experience & credentials

export async function listExperience() {
  const rows = await db()
    .select()
    .from(s.experiences)
    .where(live(s.experiences))
    .orderBy(
      sql`${s.experiences.endedOn} DESC NULLS FIRST`,
      sql`${s.experiences.startedOn} DESC NULLS LAST`,
    );
  const skillMap = await namesFor(
    s.experienceSkills,
    s.experienceSkills.experienceId,
    s.experienceSkills.skillId,
    rows.map((r) => r.id),
  );
  return rows.map((row) => ({ ...row, skills: skillMap.get(row.id) ?? [] }));
}

export async function listCertifications(
  filters: { kind?: string; featured?: boolean; limit?: number } = {},
) {
  const where: SQL[] = [live(s.certifications)];
  if (filters.kind) where.push(sql`${s.certifications.kind}::text = ${filters.kind}`);
  if (filters.featured) where.push(eq(s.certifications.isFeatured, true));
  const rows = await db()
    .select()
    .from(s.certifications)
    .where(and(...where))
    .orderBy(sql`${s.certifications.issuedOn} DESC NULLS LAST`)
    .limit(filters.limit ?? 200);
  const [skillMap, media] = await Promise.all([
    namesFor(
      s.certificationSkills,
      s.certificationSkills.certificationId,
      s.certificationSkills.skillId,
      rows.map((r) => r.id),
    ),
    publicMedia(rows.map((r) => r.mediaId)),
  ]);
  return rows.map((row) => ({
    ...row,
    skills: skillMap.get(row.id) ?? [],
    file: row.mediaId ? (media.get(row.mediaId) ?? null) : null,
  }));
}

export async function listAchievements(
  filters: { kind?: string; featured?: boolean; limit?: number } = {},
) {
  const where: SQL[] = [live(s.achievements)];
  if (filters.kind) where.push(sql`${s.achievements.kind}::text = ${filters.kind}`);
  if (filters.featured) where.push(eq(s.achievements.isFeatured, true));
  const rows = await db()
    .select()
    .from(s.achievements)
    .where(and(...where))
    .orderBy(sql`${s.achievements.achievedOn} DESC NULLS LAST`)
    .limit(filters.limit ?? 200);
  const media = await publicMedia(rows.map((r) => r.mediaId));
  return rows.map((row) => ({
    ...row,
    file: row.mediaId ? (media.get(row.mediaId) ?? null) : null,
  }));
}

// ---------------------------------------------------------------- journal

const JOURNAL_PAGE = 10;

export async function listJournal(
  filters: { q?: string; tag?: string; month?: string; page?: number; limit?: number } = {},
) {
  const where: SQL[] = [live(s.journalEntries)];
  if (filters.q) where.push(textMatch(s.journalEntries.search, s.journalEntries.title, filters.q));
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    where.push(sql`to_char(${s.journalEntries.entryDate}, 'YYYY-MM') = ${filters.month}`);
  }
  if (filters.tag) {
    where.push(
      inArray(
        s.journalEntries.id,
        db()
          .select({ id: s.journalTags.entryId })
          .from(s.journalTags)
          .innerJoin(s.tags, eq(s.tags.id, s.journalTags.tagId))
          .where(eq(s.tags.slug, filters.tag)),
      ),
    );
  }
  const limit = filters.limit ?? JOURNAL_PAGE;
  const page = Math.max(1, filters.page ?? 1);
  const [rows, [total]] = await Promise.all([
    db()
      .select({
        id: s.journalEntries.id,
        slug: s.journalEntries.slug,
        title: s.journalEntries.title,
        entryDate: s.journalEntries.entryDate,
        topic: s.journalEntries.topic,
        summary: s.journalEntries.summary,
        learnedMd: s.journalEntries.learnedMd,
      })
      .from(s.journalEntries)
      .where(and(...where))
      .orderBy(desc(s.journalEntries.entryDate), desc(s.journalEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db()
      .select({ value: count() })
      .from(s.journalEntries)
      .where(and(...where)),
  ]);
  const tagMap = await tagsFor(
    s.journalTags,
    s.journalTags.entryId,
    s.journalTags.tagId,
    rows.map((r) => r.id),
  );
  return {
    items: rows.map((row) => ({ ...row, tags: tagMap.get(row.id) ?? [] })),
    total: Number(total?.value ?? 0),
    page,
    pageSize: limit,
  };
}

/** Months that have entries, newest first, for the archive. */
export async function journalMonths() {
  const rows = await db()
    .select({
      month: sql<string>`to_char(${s.journalEntries.entryDate}, 'YYYY-MM')`,
      entries: count(),
    })
    .from(s.journalEntries)
    .where(live(s.journalEntries))
    .groupBy(sql`1`)
    .orderBy(sql`1 DESC`);
  return rows.map((row) => ({ month: row.month, entries: Number(row.entries) }));
}

export async function journalTags() {
  return db()
    .selectDistinct({ name: s.tags.name, slug: s.tags.slug })
    .from(s.tags)
    .innerJoin(s.journalTags, eq(s.journalTags.tagId, s.tags.id))
    .innerJoin(s.journalEntries, eq(s.journalEntries.id, s.journalTags.entryId))
    .where(live(s.journalEntries))
    .orderBy(asc(s.tags.name));
}

async function journalDetail(where: SQL, withNeighbours: boolean) {
  const [entry] = await db().select().from(s.journalEntries).where(where).limit(1);
  if (!entry) return null;
  const images = await db()
    .select({ mediaId: s.journalMedia.mediaId })
    .from(s.journalMedia)
    .where(eq(s.journalMedia.entryId, entry.id))
    .orderBy(asc(s.journalMedia.sortOrder));
  const [skillMap, tagMap, media] = await Promise.all([
    namesFor(s.journalSkills, s.journalSkills.entryId, s.journalSkills.skillId, [entry.id]),
    tagsFor(s.journalTags, s.journalTags.entryId, s.journalTags.tagId, [entry.id]),
    publicMedia(images.map((i) => i.mediaId)),
  ]);
  let previous: { slug: string; title: string } | null = null;
  let next: { slug: string; title: string } | null = null;
  if (withNeighbours) {
    const pick = { slug: s.journalEntries.slug, title: s.journalEntries.title };
    [[previous = null], [next = null]] = await Promise.all([
      db()
        .select(pick)
        .from(s.journalEntries)
        .where(and(live(s.journalEntries), lt(s.journalEntries.entryDate, entry.entryDate)))
        .orderBy(desc(s.journalEntries.entryDate))
        .limit(1),
      db()
        .select(pick)
        .from(s.journalEntries)
        .where(and(live(s.journalEntries), gt(s.journalEntries.entryDate, entry.entryDate)))
        .orderBy(asc(s.journalEntries.entryDate))
        .limit(1),
    ]);
  }
  const files = images.map((i) => media.get(i.mediaId)).filter((m) => m !== undefined);
  return {
    ...entry,
    skills: skillMap.get(entry.id) ?? [],
    tags: tagMap.get(entry.id) ?? [],
    // Images render inline; documents (PDFs) are listed as attachments.
    images: files.filter((f) => f.kind === "image"),
    attachments: files.filter((f) => f.kind === "document"),
    previous,
    next,
  };
}

export async function getJournalEntry(slug: string) {
  return journalDetail(and(eq(s.journalEntries.slug, slug), live(s.journalEntries))!, true);
}

/** Admin preview only: ignores the visibility rule. Callers must check the admin session. */
export async function getJournalEntryForPreview(id: string) {
  return journalDetail(eq(s.journalEntries.id, id), false);
}

// ---------------------------------------------------------------- resources

export async function listResources(
  filters: { q?: string; category?: string; kind?: string; page?: number } = {},
) {
  const where: SQL[] = [live(s.resources)];
  if (filters.q) where.push(textMatch(s.resources.search, s.resources.title, filters.q));
  if (filters.category) where.push(eq(s.categories.slug, filters.category));
  if (filters.kind) where.push(sql`${s.resources.kind}::text = ${filters.kind}`);
  const limit = 24;
  const page = Math.max(1, filters.page ?? 1);
  const [rows, [total]] = await Promise.all([
    db()
      .select({
        id: s.resources.id,
        title: s.resources.title,
        url: s.resources.url,
        kind: s.resources.kind,
        description: s.resources.description,
        notesMd: s.resources.notesMd,
        addedOn: s.resources.addedOn,
        categoryName: s.categories.name,
      })
      .from(s.resources)
      .leftJoin(s.categories, eq(s.categories.id, s.resources.categoryId))
      .where(and(...where))
      .orderBy(asc(s.resources.sortOrder), desc(s.resources.addedOn), asc(s.resources.title))
      .limit(limit)
      .offset((page - 1) * limit),
    db()
      .select({ value: count() })
      .from(s.resources)
      .leftJoin(s.categories, eq(s.categories.id, s.resources.categoryId))
      .where(and(...where)),
  ]);
  const tagMap = await tagsFor(
    s.resourceTags,
    s.resourceTags.resourceId,
    s.resourceTags.tagId,
    rows.map((r) => r.id),
  );
  return {
    items: rows.map((row) => ({ ...row, tags: tagMap.get(row.id) ?? [] })),
    total: Number(total?.value ?? 0),
    page,
    pageSize: limit,
  };
}

// ---------------------------------------------------------------- search

export const SEARCH_TYPES = [
  "projects",
  "journal",
  "skills",
  "experience",
  "certifications",
  "achievements",
  "resources",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export interface SearchHit {
  type: SearchType;
  title: string;
  summary: string;
  url: string;
  rank: number;
}

/**
 * Global search over every public content type. `websearch_to_tsquery`
 * accepts any user input without syntax errors; the query is parameterized.
 */
export async function searchSite(q: string, type?: string): Promise<SearchHit[]> {
  const query = q.trim().slice(0, 100);
  if (query.length < 2) return [];
  const tsq = sql`websearch_to_tsquery('english', ${query})`;
  const pattern = likePattern(query);
  const rank = (search: AnyPgColumn) => sql<number>`ts_rank(${search}, ${tsq})`;
  const match = (search: AnyPgColumn, title: AnyPgColumn) =>
    or(sql`${search} @@ ${tsq}`, sql`${title} ILIKE ${pattern}`);

  const queries: Record<SearchType, () => Promise<SearchHit[]>> = {
    projects: async () =>
      (
        await db()
          .select({
            title: s.projects.title,
            summary: s.projects.summary,
            slug: s.projects.slug,
            rank: rank(s.projects.search),
          })
          .from(s.projects)
          .where(and(live(s.projects), match(s.projects.search, s.projects.title)))
          .limit(20)
      ).map((r) => ({
        type: "projects",
        title: r.title,
        summary: r.summary,
        url: `/projects/${r.slug}`,
        rank: Number(r.rank) + 0.2,
      })),
    journal: async () =>
      (
        await db()
          .select({
            title: s.journalEntries.title,
            summary: s.journalEntries.summary,
            slug: s.journalEntries.slug,
            rank: rank(s.journalEntries.search),
          })
          .from(s.journalEntries)
          .where(
            and(live(s.journalEntries), match(s.journalEntries.search, s.journalEntries.title)),
          )
          .limit(20)
      ).map((r) => ({
        type: "journal",
        title: r.title,
        summary: r.summary,
        url: `/journal/${r.slug}`,
        rank: Number(r.rank),
      })),
    skills: async () =>
      (
        await db()
          .select({
            title: s.skills.name,
            summary: s.skills.descriptionMd,
            slug: s.skills.slug,
            rank: rank(s.skills.search),
          })
          .from(s.skills)
          .where(and(live(s.skills), match(s.skills.search, s.skills.name)))
          .limit(20)
      ).map((r) => ({
        type: "skills",
        title: r.title,
        summary: r.summary.slice(0, 200),
        url: `/skills#${r.slug}`,
        rank: Number(r.rank) + 0.1,
      })),
    experience: async () =>
      (
        await db()
          .select({
            role: s.experiences.role,
            organization: s.experiences.organization,
            id: s.experiences.id,
            rank: rank(s.experiences.search),
          })
          .from(s.experiences)
          .where(and(live(s.experiences), match(s.experiences.search, s.experiences.role)))
          .limit(20)
      ).map((r) => ({
        type: "experience",
        title: `${r.role} · ${r.organization}`,
        summary: "",
        url: `/experience#e-${r.id}`,
        rank: Number(r.rank),
      })),
    certifications: async () =>
      (
        await db()
          .select({
            title: s.certifications.title,
            issuer: s.certifications.issuer,
            id: s.certifications.id,
            rank: rank(s.certifications.search),
          })
          .from(s.certifications)
          .where(
            and(live(s.certifications), match(s.certifications.search, s.certifications.title)),
          )
          .limit(20)
      ).map((r) => ({
        type: "certifications",
        title: r.title,
        summary: r.issuer,
        url: `/achievements#c-${r.id}`,
        rank: Number(r.rank),
      })),
    achievements: async () =>
      (
        await db()
          .select({
            title: s.achievements.title,
            organization: s.achievements.organization,
            id: s.achievements.id,
            rank: rank(s.achievements.search),
          })
          .from(s.achievements)
          .where(and(live(s.achievements), match(s.achievements.search, s.achievements.title)))
          .limit(20)
      ).map((r) => ({
        type: "achievements",
        title: r.title,
        summary: r.organization ?? "",
        url: `/achievements#a-${r.id}`,
        rank: Number(r.rank),
      })),
    resources: async () =>
      (
        await db()
          .select({
            title: s.resources.title,
            summary: s.resources.description,
            id: s.resources.id,
            rank: rank(s.resources.search),
          })
          .from(s.resources)
          .where(and(live(s.resources), match(s.resources.search, s.resources.title)))
          .limit(20)
      ).map((r) => ({
        type: "resources",
        title: r.title,
        summary: r.summary,
        url: `/resources#r-${r.id}`,
        rank: Number(r.rank),
      })),
  };

  const selected = (SEARCH_TYPES as readonly string[]).includes(type ?? "")
    ? [type as SearchType]
    : [...SEARCH_TYPES];
  const results = (await Promise.all(selected.map((key) => queries[key]()))).flat();
  return results.sort((a, b) => b.rank - a.rank).slice(0, 50);
}

// ---------------------------------------------------------------- sitemap

export async function sitemapEntries() {
  const [projects, journal] = await Promise.all([
    db()
      .select({ slug: s.projects.slug, updatedAt: s.projects.updatedAt })
      .from(s.projects)
      .where(live(s.projects)),
    db()
      .select({ slug: s.journalEntries.slug, updatedAt: s.journalEntries.updatedAt })
      .from(s.journalEntries)
      .where(live(s.journalEntries)),
  ]);
  return { projects, journal };
}

type LiveTable = PgTable & {
  status: AnyPgColumn;
  visibility: AnyPgColumn;
  updatedAt: AnyPgColumn;
};

/** Latest change among published, public rows, or null when there are none. */
async function lastPublished(table: LiveTable): Promise<Date | null> {
  const [row] = await db()
    .select({ at: sql<string | null>`max(${table.updatedAt})` })
    .from(table)
    .where(live(table));
  return row?.at ? new Date(row.at) : null;
}

/**
 * Section pages worth listing in the sitemap — only those with published
 * content, so search engines are not sent to empty pages — with their last
 * change. Home is always listed; contact when the form or an email is offered.
 */
export async function sitemapSections(): Promise<{ path: string; lastModified?: Date }[]> {
  const [settings, profile] = await Promise.all([getSettingsRow(), getProfile()]);
  const [
    about,
    education,
    skills,
    projects,
    experience,
    achievements,
    certifications,
    journal,
    resources,
    links,
  ] = await Promise.all([
    lastPublished(s.aboutSections),
    lastPublished(s.education),
    lastPublished(s.skills),
    lastPublished(s.projects),
    lastPublished(s.experiences),
    lastPublished(s.achievements),
    lastPublished(s.certifications),
    lastPublished(s.journalEntries),
    lastPublished(s.resources),
    lastPublished(s.links),
  ]);
  const latest = (...dates: (Date | null)[]) =>
    dates.filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  // [path, has content, last change]
  const sections: [string, boolean, Date | null][] = [
    ["/about", Boolean(about || profile.shortBio), latest(about, profile.updatedAt ?? null)],
    ["/education", Boolean(education), education],
    ["/skills", Boolean(skills), skills],
    ["/projects", Boolean(projects), projects],
    ["/experience", Boolean(experience), experience],
    [
      "/achievements",
      Boolean(achievements || certifications),
      latest(achievements, certifications),
    ],
    ["/journal", Boolean(journal), journal],
    ["/resources", Boolean(resources), resources],
    ["/links", Boolean(links), links],
  ];
  return [
    { path: "/" },
    ...sections
      .filter(([, hasContent]) => hasContent)
      .map(([path, , at]) => ({ path, ...(at ? { lastModified: at } : {}) })),
    ...(settings.contactEnabled || settings.publicEmail ? [{ path: "/contact" }] : []),
  ];
}

export async function recentJournalForFeed(limit = 30) {
  return db()
    .select({
      slug: s.journalEntries.slug,
      title: s.journalEntries.title,
      summary: s.journalEntries.summary,
      learnedMd: s.journalEntries.learnedMd,
      bodyMd: s.journalEntries.bodyMd,
      builtMd: s.journalEntries.builtMd,
      problemsMd: s.journalEntries.problemsMd,
      entryDate: s.journalEntries.entryDate,
      publishedAt: s.journalEntries.publishedAt,
      updatedAt: s.journalEntries.updatedAt,
    })
    .from(s.journalEntries)
    .where(live(s.journalEntries))
    .orderBy(desc(s.journalEntries.entryDate))
    .limit(limit);
}
