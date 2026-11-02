import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/display";
import { Container } from "@/components/ui/layout";
import { ExternalLink } from "@/components/ui/text-link";
import { label } from "@/lib/content/enums";
import type { LinkItem } from "@/server/db/schema";
import { formatDate, formatRange } from "@/lib/format";

import {
  FileLink,
  Prose,
  ResponsiveImage,
  TagList,
  type FileData,
  type ImageData,
} from "./content";

export interface ProjectArticleData {
  title: string;
  summary: string;
  projectStatus: string;
  categoryName: string | null;
  startedOn: string | null;
  completedOn: string | null;
  repoUrl: string | null;
  liveUrl: string | null;
  problemMd: string;
  solutionMd: string;
  contributionMd: string;
  architectureMd: string;
  features: string[];
  skills: { name: string; slug: string }[];
  tags: { name: string; slug: string }[];
  cover: ImageData | null;
  screenshots: ImageData[];
}

export function ProjectArticle({ project }: { project: ProjectArticleData }) {
  const sections = [
    { title: "The problem", body: project.problemMd },
    { title: "The solution", body: project.solutionMd },
    { title: "My contribution", body: project.contributionMd },
    { title: "Architecture", body: project.architectureMd },
  ].filter((section) => section.body.trim());
  const dates = formatRange(
    project.startedOn,
    project.completedOn,
    project.projectStatus === "completed" ? "" : "Present",
  );

  return (
    <article>
      <Container className="pt-10 md:pt-16">
        <Link
          href="/projects"
          className="relative after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-[''] inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> All projects
        </Link>
        <header className="mt-6 flex max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={project.projectStatus === "in_progress" ? "warning" : "success"}>
              {label(project.projectStatus)}
            </Badge>
            {project.categoryName && (
              <span className="text-small text-fg-muted">{project.categoryName}</span>
            )}
            {dates && <span className="font-mono text-small text-fg-muted">{dates}</span>}
          </div>
          <h1 className="text-h1 font-semibold">{project.title}</h1>
          {project.summary && <p className="text-body-lg text-fg-muted">{project.summary}</p>}
          <div className="flex flex-wrap gap-4">
            {project.liveUrl && (
              <ExternalLink href={project.liveUrl} newTab>
                Live demo
              </ExternalLink>
            )}
            {project.repoUrl && (
              <ExternalLink href={project.repoUrl} newTab>
                Source code
              </ExternalLink>
            )}
          </div>
        </header>
      </Container>

      {project.cover && (
        <Container className="mt-10">
          <ResponsiveImage
            image={project.cover}
            sizes="(min-width: 1200px) 1136px, 100vw"
            priority
            className="w-full rounded-[var(--radius-card)] border border-line object-cover"
          />
        </Container>
      )}

      <Container className="grid gap-12 py-12 md:py-16 lg:grid-cols-[1fr_280px] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-12">
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-4">
              <h2 className="text-h2 font-semibold">{section.title}</h2>
              <Prose markdown={section.body} />
            </section>
          ))}
          {project.features.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-h2 font-semibold">Key features</h2>
              <ul className="prose list-disc">
                {project.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </section>
          )}
          {project.screenshots.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-h2 font-semibold">Screenshots</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {project.screenshots.map((image) => (
                  <a
                    key={image.src}
                    href={image.src}
                    target="_blank"
                    rel="noopener"
                    className="block"
                  >
                    <ResponsiveImage
                      image={image}
                      sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
                      className="w-full rounded-[var(--radius-button)] border border-line"
                    />
                    <span className="sr-only">Open full size (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="flex flex-col gap-8">
          {project.skills.length > 0 && (
            <div>
              <h2 className="eyebrow">Technologies</h2>
              <div className="mt-3">
                <TagList items={project.skills} label="Technologies" />
              </div>
            </div>
          )}
          {project.tags.length > 0 && (
            <div>
              <h2 className="eyebrow">Tags</h2>
              <div className="mt-3">
                <TagList items={project.tags} label="Tags" />
              </div>
            </div>
          )}
        </aside>
      </Container>
    </article>
  );
}

export interface JournalArticleData {
  title: string;
  entryDate: string;
  topic: string | null;
  summary: string;
  learnedMd: string;
  bodyMd: string;
  builtMd: string;
  problemsMd: string;
  links: LinkItem[];
  skills: { name: string; slug: string }[];
  tags: { name: string; slug: string }[];
  images: ImageData[];
  attachments: FileData[];
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export function JournalArticle({ entry }: { entry: JournalArticleData }) {
  const sections = [
    { title: "What I learned", body: entry.learnedMd },
    { title: "What I worked on", body: entry.bodyMd },
    { title: "What I built", body: entry.builtMd },
    { title: "Problems I solved", body: entry.problemsMd },
  ].filter((section) => section.body.trim());

  return (
    <article>
      <Container width="prose" className="py-10 md:py-16">
        <Link
          href="/journal"
          className="relative after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-[''] inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Journal
        </Link>
        <header className="mt-6 flex flex-col gap-3 border-b border-line pb-8">
          <time dateTime={entry.entryDate} className="font-mono text-small text-fg-muted">
            {formatDate(entry.entryDate)}
          </time>
          {entry.topic && <p className="eyebrow">{entry.topic}</p>}
          <h1 className="text-h1 font-semibold">{entry.title}</h1>
          {entry.summary && <p className="text-body-lg text-fg-muted">{entry.summary}</p>}
          <TagList items={entry.tags} label="Tags" />
        </header>
        <div className="mt-10 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-h3 font-semibold">{section.title}</h2>
              <Prose markdown={section.body} />
            </section>
          ))}
          {entry.images.length > 0 && (
            <div className="flex flex-col gap-4">
              {entry.images.map((image) => (
                <ResponsiveImage
                  key={image.src}
                  image={image}
                  sizes="(min-width: 768px) 720px, 100vw"
                  className="w-full rounded-[var(--radius-button)] border border-line"
                />
              ))}
            </div>
          )}
          {entry.attachments.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-h3 font-semibold">Attachments</h2>
              <ul className="flex flex-col gap-2">
                {entry.attachments.map((file) => (
                  <li key={file.href}>
                    <FileLink file={file} label={file.name} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {entry.skills.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-h3 font-semibold">Technologies</h2>
              <TagList items={entry.skills} label="Technologies" />
            </section>
          )}
          {entry.links.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-h3 font-semibold">Resources</h2>
              <ul className="flex flex-col gap-2">
                {entry.links.map((link) => (
                  <li key={link.url}>
                    <ExternalLink href={link.url} newTab>
                      {link.label}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {(entry.previous || entry.next) && (
          <nav
            aria-label="More entries"
            className="mt-16 grid gap-4 border-t border-line pt-8 sm:grid-cols-2"
          >
            {entry.previous ? (
              <Link
                href={`/journal/${entry.previous.slug}` as Route}
                className="group flex flex-col gap-1"
              >
                <span className="inline-flex items-center gap-1 text-small text-fg-muted">
                  <ArrowLeft aria-hidden="true" className="size-4" /> Earlier
                </span>
                <span className="font-medium group-hover:text-accent">{entry.previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {entry.next && (
              <Link
                href={`/journal/${entry.next.slug}` as Route}
                className="group flex flex-col gap-1 sm:items-end sm:text-right"
              >
                <span className="inline-flex items-center gap-1 text-small text-fg-muted">
                  Later <ArrowRight aria-hidden="true" className="size-4" />
                </span>
                <span className="font-medium group-hover:text-accent">{entry.next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </Container>
    </article>
  );
}
