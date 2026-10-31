import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { publishable, searchDocument, timestamps, tsvector } from "./common";
import {
  achievementKind,
  categoryScope,
  credentialKind,
  experienceKind,
  experienceLevel,
  learningStatus,
  linkKind,
  projectStatus,
  resourceKind,
} from "./enums";
import { mediaAssets } from "./media";

export interface LinkItem {
  label: string;
  url: string;
}

// ---------------------------------------------------------------- taxonomy

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    scope: categoryScope().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex().on(t.scope, t.slug)],
);

export const tags = pgTable("tags", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  ...timestamps(),
});

// ---------------------------------------------------------------- education

export const education = pgTable(
  "education",
  {
    id: uuid().primaryKey().defaultRandom(),
    institution: text().notNull(),
    institutionUrl: text(),
    degree: text().notNull(),
    branch: text(),
    startYear: smallint(),
    endYear: smallint(),
    /** Free text such as "Second year" — never inferred. */
    currentStatus: text(),
    currentSemester: smallint(),
    descriptionMd: text().notNull().default(""),
    coursework: jsonb().$type<string[]>().notNull().default([]),
    ...publishable(),
  },
  (t) => [
    check(
      "education_years",
      sql`${t.endYear} IS NULL OR ${t.startYear} IS NULL OR ${t.endYear} >= ${t.startYear}`,
    ),
  ],
);

// ---------------------------------------------------------------- skills

export const skills = pgTable(
  "skills",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    name: text().notNull(),
    slug: text().notNull().unique(),
    descriptionMd: text().notNull().default(""),
    learningStatus: learningStatus().notNull().default("learning"),
    /** Null until the owner sets it; never assigned automatically. */
    experienceLevel: experienceLevel(),
    lastReviewedOn: date(),
    search: tsvector().generatedAlwaysAs(searchDocument(["name"], ["description_md"])),
    ...publishable(),
  },
  (t) => [index().using("gin", t.search), index().on(t.categoryId)],
);

// ---------------------------------------------------------------- projects

export const projects = pgTable(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    summary: text().notNull().default(""),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    problemMd: text().notNull().default(""),
    solutionMd: text().notNull().default(""),
    contributionMd: text().notNull().default(""),
    architectureMd: text().notNull().default(""),
    features: jsonb().$type<string[]>().notNull().default([]),
    repoUrl: text(),
    liveUrl: text(),
    projectStatus: projectStatus().notNull().default("in_progress"),
    startedOn: date(),
    completedOn: date(),
    coverMediaId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    seoTitle: text(),
    seoDescription: text(),
    search: tsvector().generatedAlwaysAs(
      searchDocument(
        ["title"],
        ["summary"],
        ["problem_md", "solution_md", "contribution_md", "architecture_md"],
      ),
    ),
    ...publishable(),
  },
  (t) => [
    index().using("gin", t.search),
    check(
      "projects_dates",
      sql`${t.completedOn} IS NULL OR ${t.startedOn} IS NULL OR ${t.completedOn} >= ${t.startedOn}`,
    ),
  ],
);

export const projectSkills = pgTable(
  "project_skills",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.skillId] }), index().on(t.skillId)],
);

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.tagId] }), index().on(t.tagId)],
);

export const projectMedia = pgTable(
  "project_media",
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: uuid()
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.mediaId] })],
);

// ---------------------------------------------------------------- experience

export const experiences = pgTable(
  "experiences",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: experienceKind().notNull(),
    organization: text().notNull(),
    organizationUrl: text(),
    role: text().notNull(),
    location: text(),
    startedOn: date(),
    endedOn: date(),
    summaryMd: text().notNull().default(""),
    responsibilities: jsonb().$type<string[]>().notNull().default([]),
    links: jsonb().$type<LinkItem[]>().notNull().default([]),
    search: tsvector().generatedAlwaysAs(searchDocument(["role", "organization"], ["summary_md"])),
    ...publishable(),
  },
  (t) => [
    index().using("gin", t.search),
    check(
      "experiences_dates",
      sql`${t.endedOn} IS NULL OR ${t.startedOn} IS NULL OR ${t.endedOn} >= ${t.startedOn}`,
    ),
  ],
);

export const experienceSkills = pgTable(
  "experience_skills",
  {
    experienceId: uuid()
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.experienceId, t.skillId] })],
);

// ---------------------------------------------------------------- credentials

export const certifications = pgTable(
  "certifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: credentialKind().notNull().default("certification"),
    title: text().notNull(),
    issuer: text().notNull(),
    issuerUrl: text(),
    issuedOn: date(),
    expiresOn: date(),
    credentialId: text(),
    verificationUrl: text(),
    /** Certificate image or PDF; may be a private file (then only the link is public). */
    mediaId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    descriptionMd: text().notNull().default(""),
    search: tsvector().generatedAlwaysAs(searchDocument(["title"], ["issuer", "description_md"])),
    ...publishable(),
  },
  (t) => [index().using("gin", t.search)],
);

export const certificationSkills = pgTable(
  "certification_skills",
  {
    certificationId: uuid()
      .notNull()
      .references(() => certifications.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.certificationId, t.skillId] })],
);

export const achievements = pgTable(
  "achievements",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: achievementKind().notNull(),
    title: text().notNull(),
    organization: text(),
    achievedOn: date(),
    descriptionMd: text().notNull().default(""),
    url: text(),
    mediaId: uuid().references(() => mediaAssets.id, { onDelete: "set null" }),
    search: tsvector().generatedAlwaysAs(
      searchDocument(["title"], ["organization", "description_md"]),
    ),
    ...publishable(),
  },
  (t) => [index().using("gin", t.search)],
);

// ---------------------------------------------------------------- journal

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    entryDate: date().notNull(),
    title: text().notNull(),
    topic: text(),
    summary: text().notNull().default(""),
    bodyMd: text().notNull().default(""),
    learnedMd: text().notNull().default(""),
    builtMd: text().notNull().default(""),
    problemsMd: text().notNull().default(""),
    links: jsonb().$type<LinkItem[]>().notNull().default([]),
    search: tsvector().generatedAlwaysAs(
      searchDocument(
        ["title"],
        ["summary", "topic"],
        ["body_md", "learned_md", "built_md", "problems_md"],
      ),
    ),
    ...publishable(),
  },
  (t) => [index().using("gin", t.search), index().on(t.entryDate)],
);

export const journalTags = pgTable(
  "journal_tags",
  {
    entryId: uuid()
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] }), index().on(t.tagId)],
);

export const journalSkills = pgTable(
  "journal_skills",
  {
    entryId: uuid()
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.skillId] })],
);

export const journalMedia = pgTable(
  "journal_media",
  {
    entryId: uuid()
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    mediaId: uuid()
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.mediaId] })],
);

// ---------------------------------------------------------------- library

export const resources = pgTable(
  "resources",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    url: text(),
    kind: resourceKind().notNull().default("website"),
    description: text().notNull().default(""),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    notesMd: text().notNull().default(""),
    addedOn: date().notNull().defaultNow(),
    search: tsvector().generatedAlwaysAs(searchDocument(["title"], ["description"], ["notes_md"])),
    ...publishable(),
  },
  (t) => [index().using("gin", t.search), index().on(t.categoryId)],
);

export const resourceTags = pgTable(
  "resource_tags",
  {
    resourceId: uuid()
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resourceId, t.tagId] }), index().on(t.tagId)],
);

export const links = pgTable("links", {
  id: uuid().primaryKey().defaultRandom(),
  label: text().notNull(),
  url: text().notNull(),
  description: text(),
  kind: linkKind().notNull().default("profile"),
  icon: text().notNull().default("link"),
  /** Adds rel="me" so profiles can verify each other. */
  relMe: boolean().notNull().default(false),
  ...publishable(),
});
