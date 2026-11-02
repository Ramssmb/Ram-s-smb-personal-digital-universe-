import Link from "next/link";
import type { Route } from "next";

import { FilterBar } from "@/components/public/filters";
import { Prose } from "@/components/public/content";
import { Badge, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { label } from "@/lib/content/enums";
import { formatDate } from "@/lib/format";
import {
  certificationsBySkill,
  listCategories,
  listSkills,
  projectsBySkill,
} from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("skills", "/skills", {
    title: "Skills",
    description: "Technical and non-technical skills, with honest learning status.",
  });
}

const STATUS_TONE = {
  planned: "neutral",
  learning: "warning",
  practicing: "accent",
  comfortable: "success",
} as const;

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const [skills, categories] = await Promise.all([
    listSkills({ q, category }),
    listCategories("skill"),
  ]);
  const skillIds = skills.map((s) => s.id);
  const [related, certified] = await Promise.all([
    projectsBySkill(skillIds),
    certificationsBySkill(skillIds),
  ]);
  const groups = new Map<string, typeof skills>();
  for (const skill of skills) {
    const key = skill.categoryName ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), skill]);
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Skills"
        title="Skills"
        description="What I know and what I am learning. Levels appear only where I am confident in them."
      />
      <div className="py-8">
        <FilterBar
          action="/skills"
          q={q}
          searchLabel="Search skills"
          selects={[
            {
              name: "category",
              label: "Category",
              value: category,
              allLabel: "All categories",
              options: categories.map((c) => ({ value: c.slug, label: c.name })),
            },
          ]}
        />
      </div>
      {skills.length === 0 ? (
        <EmptyState
          className="mb-16"
          title={q || category ? "No skills match" : "No skills published yet"}
        />
      ) : (
        <div className="flex flex-col gap-12 pb-16">
          {[...groups.entries()].map(([group, items], index) => (
            // Ids must not contain spaces: aria-labelledby splits on whitespace.
            <section key={group} aria-labelledby={`skill-group-${index}`}>
              <h2 id={`skill-group-${index}`} className="text-h3 font-semibold">
                {group}
              </h2>
              <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((skill) => (
                  <li
                    key={skill.id}
                    id={skill.slug}
                    className="flex scroll-mt-24 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <h3 className="font-semibold">{skill.name}</h3>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <Badge tone={STATUS_TONE[skill.learningStatus]}>
                          {label(skill.learningStatus)}
                        </Badge>
                        {skill.experienceLevel && <Badge>{label(skill.experienceLevel)}</Badge>}
                      </div>
                    </div>
                    <Prose markdown={skill.descriptionMd} className="text-small text-fg-muted" />
                    {(related.get(skill.id) ?? []).length > 0 && (
                      <p className="text-small text-fg-muted">
                        Used in{" "}
                        {(related.get(skill.id) ?? []).map((project, index) => (
                          <span key={project.slug}>
                            {index > 0 && ", "}
                            <Link
                              href={`/projects/${project.slug}` as Route}
                              className="font-medium text-accent underline underline-offset-2"
                            >
                              {project.title}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    {(certified.get(skill.id) ?? []).length > 0 && (
                      <p className="text-small text-fg-muted">
                        Certified through{" "}
                        {(certified.get(skill.id) ?? []).map((cert, index) => (
                          <span key={cert.id}>
                            {index > 0 && ", "}
                            <Link
                              href={`/achievements#c-${cert.id}` as Route}
                              className="font-medium text-accent underline underline-offset-2"
                            >
                              {cert.title}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    {skill.lastReviewedOn && (
                      <p className="mt-auto font-mono text-micro text-fg-muted">
                        Updated {formatDate(skill.lastReviewedOn)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
