import { pgEnum } from "drizzle-orm/pg-core";

// Shared enumerations from docs/DATABASE_DESIGN.md §3. Declared up front so
// later migrations only add tables, not types.

export const contentStatus = pgEnum("content_status", ["draft", "published", "archived"]);
export const visibility = pgEnum("visibility", ["public", "private"]);
export const userRole = pgEnum("user_role", ["owner", "editor"]);
export const learningStatus = pgEnum("learning_status", [
  "planned",
  "learning",
  "practicing",
  "comfortable",
]);
export const experienceLevel = pgEnum("experience_level", ["beginner", "intermediate", "advanced"]);
export const projectStatus = pgEnum("project_status", [
  "planned",
  "in_progress",
  "completed",
  "maintained",
  "paused",
  "archived",
]);
export const experienceKind = pgEnum("experience_kind", [
  "internship",
  "job",
  "freelance",
  "open_source",
  "volunteer",
  "team",
  "responsibility",
]);
export const credentialKind = pgEnum("credential_kind", ["certification", "course"]);
export const achievementKind = pgEnum("achievement_kind", [
  "award",
  "competition",
  "hackathon",
  "academic",
  "technical",
  "milestone",
]);
export const mediaAccess = pgEnum("media_access", ["public", "private"]);
export const messageStatus = pgEnum("message_status", ["new", "read", "archived", "spam"]);
export const themePreference = pgEnum("theme_preference", ["system", "light", "dark"]);
