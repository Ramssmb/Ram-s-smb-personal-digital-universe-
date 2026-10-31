import "server-only";

import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import type { CollectionKey } from "@/lib/content/collections";
import * as s from "@/server/db/schema";

/** A many-to-many field stored in a join table. */
export interface JoinDef {
  field: string;
  table: PgTable;
  own: AnyPgColumn;
  other: AnyPgColumn;
  /** Join tables with a sort column keep the submitted order (e.g. screenshots). */
  sort?: AnyPgColumn;
}

export interface TableDef {
  table: PgTable & {
    id: AnyPgColumn;
    updatedAt: AnyPgColumn;
  };
  joins: JoinDef[];
  /** Has status/visibility/isFeatured/sortOrder/publishedAt columns. */
  publishable: boolean;
  hasSortOrder: boolean;
}

export const TABLES: Record<CollectionKey, TableDef> = {
  "about-sections": { table: s.aboutSections, joins: [], publishable: true, hasSortOrder: true },
  education: { table: s.education, joins: [], publishable: true, hasSortOrder: true },
  skills: { table: s.skills, joins: [], publishable: true, hasSortOrder: true },
  projects: {
    table: s.projects,
    publishable: true,
    hasSortOrder: true,
    joins: [
      {
        field: "skillIds",
        table: s.projectSkills,
        own: s.projectSkills.projectId,
        other: s.projectSkills.skillId,
      },
      {
        field: "tagIds",
        table: s.projectTags,
        own: s.projectTags.projectId,
        other: s.projectTags.tagId,
      },
      {
        field: "mediaIds",
        table: s.projectMedia,
        own: s.projectMedia.projectId,
        other: s.projectMedia.mediaId,
        sort: s.projectMedia.sortOrder,
      },
    ],
  },
  experience: {
    table: s.experiences,
    publishable: true,
    hasSortOrder: true,
    joins: [
      {
        field: "skillIds",
        table: s.experienceSkills,
        own: s.experienceSkills.experienceId,
        other: s.experienceSkills.skillId,
      },
    ],
  },
  certifications: {
    table: s.certifications,
    publishable: true,
    hasSortOrder: true,
    joins: [
      {
        field: "skillIds",
        table: s.certificationSkills,
        own: s.certificationSkills.certificationId,
        other: s.certificationSkills.skillId,
      },
    ],
  },
  achievements: { table: s.achievements, joins: [], publishable: true, hasSortOrder: true },
  journal: {
    table: s.journalEntries,
    publishable: true,
    hasSortOrder: true,
    joins: [
      {
        field: "skillIds",
        table: s.journalSkills,
        own: s.journalSkills.entryId,
        other: s.journalSkills.skillId,
      },
      {
        field: "tagIds",
        table: s.journalTags,
        own: s.journalTags.entryId,
        other: s.journalTags.tagId,
      },
      {
        field: "mediaIds",
        table: s.journalMedia,
        own: s.journalMedia.entryId,
        other: s.journalMedia.mediaId,
        sort: s.journalMedia.sortOrder,
      },
    ],
  },
  resources: {
    table: s.resources,
    publishable: true,
    hasSortOrder: true,
    joins: [
      {
        field: "tagIds",
        table: s.resourceTags,
        own: s.resourceTags.resourceId,
        other: s.resourceTags.tagId,
      },
    ],
  },
  links: { table: s.links, joins: [], publishable: true, hasSortOrder: true },
  categories: { table: s.categories, joins: [], publishable: false, hasSortOrder: true },
  tags: { table: s.tags, joins: [], publishable: false, hasSortOrder: false },
};
