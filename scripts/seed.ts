/**
 * Seeds structure and owner-verified facts only (docs/DATABASE_DESIGN.md §18).
 * Safe to run repeatedly: nothing is overwritten or duplicated.
 *
 *   npm run db:seed
 *
 * Seeded content rows are drafts. Nothing invented is ever published.
 */
import { count } from "drizzle-orm";

import { slugify } from "../src/lib/content/fields";
import { db, sqlClient } from "../src/server/db/client";
import { aboutSections, categories, education, profile } from "../src/server/db/schema";

const SKILL_CATEGORIES = [
  "Programming Languages",
  "Data Structures and Algorithms",
  "Computer Science Fundamentals",
  "Artificial Intelligence",
  "Machine Learning",
  "Generative AI",
  "Backend Development",
  "Frontend Development",
  "Databases",
  "Cloud and DevOps",
  "Developer Tools",
  "Communication",
  "Problem Solving",
  "Other Skills",
];

const RESOURCE_CATEGORIES = [
  "Programming",
  "DSA",
  "Computer Science",
  "AI and ML",
  "Generative AI",
  "Backend Development",
  "Web Development",
  "GATE Preparation",
  "Books",
  "Documentation",
  "Courses",
  "Tools",
  "Useful Websites",
];

// Titles only; the owner writes the content. Empty sections cannot be published.
const ABOUT_SECTIONS = [
  "Introduction",
  "Background",
  "Academic journey",
  "Technical interests",
  "Professional interests",
  "Goals",
  "Learning philosophy",
  "Career aspirations",
  "Areas of exploration",
];

// Confirmed by the owner (project brief, 2026-11-01).
const VERIFIED_INTERESTS = [
  "Software engineering",
  "Artificial intelligence and machine learning",
  "Backend development",
  "Computer science",
];

const now = new Date();

await db()
  .insert(categories)
  .values([
    ...SKILL_CATEGORIES.map((name, sortOrder) => ({
      scope: "skill" as const,
      name,
      slug: slugify(name),
      sortOrder,
    })),
    ...RESOURCE_CATEGORIES.map((name, sortOrder) => ({
      scope: "resource" as const,
      name,
      slug: slugify(name),
      sortOrder,
    })),
  ])
  .onConflictDoNothing();

const [aboutCount] = await db().select({ n: count() }).from(aboutSections);
if (Number(aboutCount?.n) === 0) {
  await db()
    .insert(aboutSections)
    .values(
      ABOUT_SECTIONS.map((title, sortOrder) => ({
        title,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })),
    );
}

const [educationCount] = await db().select({ n: count() }).from(education);
if (Number(educationCount?.n) === 0) {
  await db().insert(education).values({
    institution: "Dr. B. R. Ambedkar National Institute of Technology Jalandhar",
    degree: "B.Tech.",
    branch: "Computer Science and Engineering",
    createdAt: now,
    updatedAt: now,
  });
}

await db()
  .insert(profile)
  .values({ id: 1, interests: VERIFIED_INTERESTS, createdAt: now, updatedAt: now })
  .onConflictDoNothing();

console.log("Seed complete (categories, draft about sections, draft education entry, interests).");
await sqlClient().end();
