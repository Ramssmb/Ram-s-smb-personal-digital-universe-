// Enumerations shared by the database schema, validation and the admin UI.
// Adding a value here requires a migration (`npm run db:generate`).

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export const VISIBILITIES = ["public", "private"] as const;
export const USER_ROLES = ["owner", "editor"] as const;
export const LEARNING_STATUSES = ["planned", "learning", "practicing", "comfortable"] as const;
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const PROJECT_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "maintained",
  "paused",
  "archived",
] as const;
export const EXPERIENCE_KINDS = [
  "internship",
  "job",
  "freelance",
  "open_source",
  "volunteer",
  "team",
  "responsibility",
] as const;
export const CREDENTIAL_KINDS = ["certification", "course"] as const;
export const ACHIEVEMENT_KINDS = [
  "award",
  "competition",
  "hackathon",
  "academic",
  "technical",
  "milestone",
  "publication",
  "recognition",
] as const;
export const MEDIA_ACCESS = ["public", "private"] as const;
export const MESSAGE_STATUSES = ["new", "read", "archived", "spam"] as const;
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export const CATEGORY_SCOPES = ["skill", "project", "resource"] as const;
export const RESOURCE_KINDS = [
  "website",
  "documentation",
  "course",
  "book",
  "tutorial",
  "tool",
  "article",
  "note",
] as const;
export const LINK_KINDS = [
  "profile",
  "coding",
  "social",
  "writing",
  "repository",
  "email",
  "other",
] as const;
export const LINK_ICONS = [
  "github",
  "linkedin",
  "mail",
  "x",
  "youtube",
  "instagram",
  "code",
  "book",
  "globe",
  "link",
] as const;
export const SEO_PAGE_KEYS = [
  "home",
  "about",
  "education",
  "skills",
  "projects",
  "experience",
  "achievements",
  "journal",
  "resources",
  "links",
  "contact",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

/** Human labels for enum values, used in the admin UI and on public pages. */
export const LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  public: "Public",
  private: "Private",
  planned: "Planned",
  learning: "Learning",
  practicing: "Practicing",
  comfortable: "Comfortable",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  in_progress: "In progress",
  completed: "Completed",
  maintained: "Maintained",
  paused: "Paused",
  internship: "Internship",
  job: "Employment",
  freelance: "Freelance",
  open_source: "Open source",
  volunteer: "Volunteering",
  team: "Team collaboration",
  responsibility: "Responsibility",
  certification: "Certification",
  course: "Course",
  award: "Award",
  competition: "Competition",
  hackathon: "Hackathon",
  academic: "Academic",
  technical: "Technical",
  milestone: "Milestone",
  publication: "Publication",
  recognition: "Recognition",
  website: "Website",
  documentation: "Documentation",
  book: "Book",
  tutorial: "Tutorial",
  tool: "Tool",
  article: "Article",
  note: "Note",
  profile: "Profile",
  coding: "Coding",
  social: "Social",
  writing: "Writing",
  repository: "Repository",
  email: "Email",
  other: "Other",
  new: "New",
  read: "Read",
  spam: "Spam",
  system: "System",
  light: "Light",
  dark: "Dark",
  skill: "Skills",
  project: "Projects",
  resource: "Resources",
  github: "GitHub",
  linkedin: "LinkedIn",
  mail: "Email",
  x: "X",
  youtube: "YouTube",
  instagram: "Instagram",
  code: "Code",
  globe: "Website",
  link: "Link",
  home: "Home",
  about: "About",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  experience: "Experience",
  achievements: "Achievements",
  journal: "Journal",
  resources: "Resources",
  links: "Links",
  contact: "Contact",
};

export function label(value: string | null | undefined): string {
  if (!value) return "";
  return LABELS[value] ?? value;
}
