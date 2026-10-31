import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { JournalArticle, ProjectArticle } from "@/components/public/articles";
import { Prose } from "@/components/public/content";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/display";
import { Container } from "@/components/ui/layout";
import { ExternalLink } from "@/components/ui/text-link";
import { COLLECTIONS, isCollectionKey, type CollectionKey } from "@/lib/content/collections";
import { label } from "@/lib/content/enums";
import type { FieldDef } from "@/lib/content/fields";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/guard";
import {
  getIdentity,
  getJournalEntryForPreview,
  getProjectForPreview,
} from "@/server/content/public";
import { getItem } from "@/server/content/service";
import type { LinkItem } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

type Params = { params: Promise<{ collection: string; id: string }> };

async function load(collection: CollectionKey, id: string) {
  try {
    if (collection === "projects")
      return { kind: "project" as const, data: await getProjectForPreview(id) };
    if (collection === "journal")
      return { kind: "journal" as const, data: await getJournalEntryForPreview(id) };
    return { kind: "generic" as const, data: await getItem(collection, id) };
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") return null;
    throw error;
  }
}

/** Renders unpublished content exactly as visitors would see it. Owner only. */
export default async function PreviewPage({ params }: Params) {
  await requireAdminPage();
  const { collection, id } = await params;
  if (!isCollectionKey(collection)) notFound();
  const def = COLLECTIONS[collection];
  const [{ siteName }, loaded] = await Promise.all([getIdentity(), load(collection, id)]);
  if (!loaded?.data) notFound();
  const status = String(loaded.data.status ?? "draft");

  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-warning-soft px-4 py-2 text-small text-warning"
      >
        <Badge tone="warning">Preview</Badge>
        <span>
          {status === "published"
            ? "This is the published version."
            : `This ${def.singular.toLowerCase()} is ${label(status).toLowerCase()} and not visible to visitors.`}
        </span>
        <Link
          href={`/admin/content/${collection}/${id}` as Route}
          className="font-medium underline"
        >
          Back to editing
        </Link>
      </div>
      <SiteHeader siteName={siteName} />
      <main id="main" className="flex-1">
        {loaded.kind === "project" && loaded.data && <ProjectArticle project={loaded.data} />}
        {loaded.kind === "journal" && loaded.data && <JournalArticle entry={loaded.data} />}
        {loaded.kind === "generic" && (
          <Container width="prose" className="py-16">
            <p className="eyebrow">{def.singular}</p>
            <h1 className="mt-2 text-h1 font-semibold">
              {String(loaded.data[def.titleField] ?? def.singular)}
            </h1>
            <dl className="mt-10 flex flex-col gap-8">
              {def.fields
                .filter(
                  (field) => field.name !== def.titleField && hasValue(loaded.data[field.name]),
                )
                .map((field) => (
                  <div key={field.name} className="flex flex-col gap-2">
                    <dt className="eyebrow">{field.label}</dt>
                    <dd>
                      <FieldValue field={field} value={loaded.data[field.name]} />
                    </dd>
                  </div>
                ))}
            </dl>
          </Container>
        )}
      </main>
    </>
  );
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Shows a stored value the way the public pages present it. */
function FieldValue({ field, value }: { field: FieldDef; value: unknown }) {
  switch (field.kind) {
    case "markdown":
      return <Prose markdown={value as string} />;
    case "url":
      return (
        <ExternalLink href={value as string} newTab>
          {value as string}
        </ExternalLink>
      );
    case "date":
      return <span className="font-mono">{formatDate(value as string)}</span>;
    case "select":
      return <span>{label(value as string)}</span>;
    case "boolean":
      return <span>Yes</span>;
    case "string-list":
      return (
        <ul className="prose list-disc">
          {(value as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "link-list":
      return (
        <ul className="flex flex-col gap-1">
          {(value as LinkItem[]).map((link) => (
            <li key={link.url}>
              <ExternalLink href={link.url} newTab>
                {link.label}
              </ExternalLink>
            </li>
          ))}
        </ul>
      );
    case "category":
    case "media":
    case "relation-many":
    case "media-many":
      // Linked items are shown on the public page once both sides are published.
      return (
        <span className="text-fg-muted">Linked ({Array.isArray(value) ? value.length : 1})</span>
      );
    default:
      return <p className="whitespace-pre-wrap">{String(value)}</p>;
  }
}
