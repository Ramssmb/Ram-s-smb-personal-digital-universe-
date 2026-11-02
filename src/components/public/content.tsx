import { ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";

import { Badge, Tag } from "@/components/ui/display";
import { ExternalLink } from "@/components/ui/text-link";
import { label } from "@/lib/content/enums";
import { formatDate, formatRange } from "@/lib/format";
import { cn } from "@/lib/cn";
import { renderMarkdown } from "@/server/markdown";

/** Sanitized Markdown (see src/server/markdown.ts). Renders nothing when empty. */
export function Prose({
  markdown,
  className,
}: {
  markdown: string | null | undefined;
  className?: string;
}) {
  const html = renderMarkdown(markdown);
  if (!html) return null;
  return <div className={cn("prose", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export interface ImageData {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

/** Pre-optimized responsive image from the media library. */
export function ResponsiveImage({
  image,
  sizes,
  priority = false,
  className,
}: {
  image: ImageData;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (priority) {
    // Announce the likely LCP image in <head> so the download starts before the body is parsed.
    preload(image.src, {
      as: "image",
      imageSrcSet: image.srcSet,
      imageSizes: sizes,
      fetchPriority: "high",
    });
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variants are generated at upload time
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
    />
  );
}

export function TagList({
  items,
  label: listLabel,
}: {
  items: { name: string; slug: string }[];
  label: string;
}) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={listLabel}>
      {items.map((item) => (
        <li key={item.slug}>
          <Tag>{item.name}</Tag>
        </li>
      ))}
    </ul>
  );
}

const PROJECT_TONE: Record<string, "success" | "warning" | "neutral" | "accent"> = {
  completed: "success",
  maintained: "success",
  in_progress: "warning",
  planned: "neutral",
  paused: "neutral",
  archived: "neutral",
};

export interface ProjectCardData {
  slug: string;
  title: string;
  summary: string;
  projectStatus: string;
  startedOn: string | null;
  completedOn: string | null;
  categoryName: string | null;
  skills: { name: string; slug: string }[];
  cover: ImageData | null;
}

export function ProjectCard({
  project,
  priority = false,
  headingLevel = 3,
}: {
  project: ProjectCardData;
  priority?: boolean;
  /** 2 on pages where the cards follow the h1 directly; 3 under a section heading. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-[border-color,transform] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-line-strong">
      {project.cover && (
        <ResponsiveImage
          image={project.cover}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="aspect-[16/9] w-full border-b border-line object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={PROJECT_TONE[project.projectStatus] ?? "neutral"}>
            {label(project.projectStatus)}
          </Badge>
          {project.categoryName && (
            <span className="text-small text-fg-muted">{project.categoryName}</span>
          )}
        </div>
        <Heading className="text-h3 font-semibold">
          <Link
            href={`/projects/${project.slug}` as Route}
            className="after:absolute after:inset-0"
          >
            {project.title}
          </Link>
        </Heading>
        {project.summary && <p className="text-small text-fg-muted">{project.summary}</p>}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <TagList items={project.skills.slice(0, 6)} label="Technologies" />
          {(project.startedOn || project.completedOn) && (
            <p className="font-mono text-micro text-fg-muted">
              {formatRange(
                project.startedOn,
                project.completedOn,
                project.projectStatus === "completed" ? "" : "Present",
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export interface JournalItemData {
  slug: string;
  title: string;
  entryDate: string;
  topic: string | null;
  summary: string;
  tags: { name: string; slug: string }[];
}

export function JournalItem({
  entry,
  headingLevel = 3,
}: {
  entry: JournalItemData;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative grid gap-2 py-6 sm:grid-cols-[120px_1fr] sm:gap-6">
      <time dateTime={entry.entryDate} className="font-mono text-small text-fg-muted">
        {formatDate(entry.entryDate)}
      </time>
      <div className="flex flex-col gap-2">
        {entry.topic && <p className="eyebrow">{entry.topic}</p>}
        <Heading className="text-h3 font-semibold transition-colors group-hover:text-accent">
          <Link href={`/journal/${entry.slug}` as Route} className="after:absolute after:inset-0">
            {entry.title}
          </Link>
        </Heading>
        {entry.summary && <p className="text-fg-muted">{entry.summary}</p>}
        <TagList items={entry.tags} label="Tags" />
      </div>
    </article>
  );
}

export function SectionHeading({
  title,
  action,
  id,
}: {
  title: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 id={id} className="text-h2 font-semibold">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function MoreLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="relative after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-[''] inline-flex shrink-0 items-center gap-1 text-small font-medium text-fg-muted transition-colors hover:text-fg"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

export interface FileData {
  href: string;
  kind: "image" | "document";
  name: string;
}

/** Link to a public certificate or achievement file. */
export function FileLink({ file, label: text }: { file: FileData; label: string }) {
  return (
    <a
      href={file.href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 text-small font-medium text-accent"
    >
      <FileText aria-hidden="true" className="size-4" />
      {text}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SafeLink({
  href,
  children,
}: {
  href: string | null | undefined;
  children: ReactNode;
}) {
  if (!href) return null;
  return (
    <ExternalLink href={href} newTab className="text-small">
      {children}
    </ExternalLink>
  );
}

/** Structured data for search engines. `<` is escaped so content cannot close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
