import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalArticle } from "@/components/public/articles";
import { JsonLd } from "@/components/public/content";
import { plainExcerpt } from "@/lib/format";
import { getIdentity, getJournalEntry } from "@/server/content/public";
import { absoluteUrl } from "@/server/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = await getJournalEntry((await params).slug);
  if (!entry) return { title: "Entry not found" };
  const description = describe(entry);
  return {
    title: entry.title,
    description,
    alternates: { canonical: `/journal/${entry.slug}` },
    openGraph: {
      type: "article",
      title: entry.title,
      description,
      url: `/journal/${entry.slug}`,
      publishedTime: entry.entryDate,
    },
  };
}

export default async function JournalEntryPage({ params }: Params) {
  const entry = await getJournalEntry((await params).slug);
  if (!entry) notFound();
  const { profile } = await getIdentity();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: entry.title,
          ...(describe(entry) ? { description: describe(entry) } : {}),
          datePublished: entry.entryDate,
          dateModified: entry.updatedAt.toISOString(),
          url: absoluteUrl(`/journal/${entry.slug}`),
          ...(entry.tags.length ? { keywords: entry.tags.map((t) => t.name).join(", ") } : {}),
          ...(profile.displayName
            ? { author: { "@type": "Person", name: profile.displayName } }
            : {}),
        }}
      />
      <JournalArticle entry={entry} />
    </>
  );
}

/** The summary, or else an excerpt of the first section that has content. */
function describe(entry: {
  summary: string;
  learnedMd: string;
  bodyMd: string;
  builtMd: string;
  problemsMd: string;
}): string | undefined {
  const source = [
    entry.summary,
    entry.learnedMd,
    entry.bodyMd,
    entry.builtMd,
    entry.problemsMd,
  ].find((s) => s.trim());
  return source ? plainExcerpt(source) : undefined;
}
