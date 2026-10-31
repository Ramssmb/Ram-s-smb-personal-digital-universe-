CREATE TYPE "public"."achievement_kind" AS ENUM('award', 'competition', 'hackathon', 'academic', 'technical', 'milestone');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."credential_kind" AS ENUM('certification', 'course');--> statement-breakpoint
CREATE TYPE "public"."experience_kind" AS ENUM('internship', 'job', 'freelance', 'open_source', 'volunteer', 'team', 'responsibility');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."learning_status" AS ENUM('planned', 'learning', 'practicing', 'comfortable');--> statement-breakpoint
CREATE TYPE "public"."media_access" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('new', 'read', 'archived', 'spam');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planned', 'in_progress', 'completed', 'maintained', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('system', 'light', 'dark');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"site_name" text,
	"title_template" text DEFAULT '%s' NOT NULL,
	"default_description" text,
	"default_theme" "theme_preference" DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1),
	CONSTRAINT "site_settings_site_name_length" CHECK (char_length("site_settings"."site_name") <= 80),
	CONSTRAINT "site_settings_title_template" CHECK (char_length("site_settings"."title_template") <= 120 AND position('%s' in "site_settings"."title_template") > 0),
	CONSTRAINT "site_settings_description_length" CHECK (char_length("site_settings"."default_description") <= 300)
);
