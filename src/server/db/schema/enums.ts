import { pgEnum } from "drizzle-orm/pg-core";

// Shared enumerations (docs/DATABASE_DESIGN.md §3). The value lists live in
// src/lib/content/enums.ts so client forms and the database share one source.
import {
  ACHIEVEMENT_KINDS,
  CATEGORY_SCOPES,
  CONTENT_STATUSES,
  CREDENTIAL_KINDS,
  EXPERIENCE_KINDS,
  EXPERIENCE_LEVELS,
  LEARNING_STATUSES,
  LINK_KINDS,
  MEDIA_ACCESS,
  MESSAGE_STATUSES,
  PROJECT_STATUSES,
  RESOURCE_KINDS,
  THEME_PREFERENCES,
  USER_ROLES,
  VISIBILITIES,
} from "../../../lib/content/enums";

export const contentStatus = pgEnum("content_status", CONTENT_STATUSES);
export const visibility = pgEnum("visibility", VISIBILITIES);
export const userRole = pgEnum("user_role", USER_ROLES);
export const learningStatus = pgEnum("learning_status", LEARNING_STATUSES);
export const experienceLevel = pgEnum("experience_level", EXPERIENCE_LEVELS);
export const projectStatus = pgEnum("project_status", PROJECT_STATUSES);
export const experienceKind = pgEnum("experience_kind", EXPERIENCE_KINDS);
export const credentialKind = pgEnum("credential_kind", CREDENTIAL_KINDS);
export const achievementKind = pgEnum("achievement_kind", ACHIEVEMENT_KINDS);
export const mediaAccess = pgEnum("media_access", MEDIA_ACCESS);
export const messageStatus = pgEnum("message_status", MESSAGE_STATUSES);
export const themePreference = pgEnum("theme_preference", THEME_PREFERENCES);
export const categoryScope = pgEnum("category_scope", CATEGORY_SCOPES);
export const resourceKind = pgEnum("resource_kind", RESOURCE_KINDS);
export const linkKind = pgEnum("link_kind", LINK_KINDS);
