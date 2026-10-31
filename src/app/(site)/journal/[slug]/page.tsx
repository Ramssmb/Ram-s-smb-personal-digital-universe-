import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalArticle } from "@/components/public/articles";
import { JsonLd } from "@/components/public/content";
import { getIdentity, getJournalEntry } from "@/server/content/public";
import { absoluteUrl } from "@/server/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = await getJournalEntry((await params).slug);
  if (!entry) return { title: "Entry not found" };
  return {
    title: entry.title,
    description: entry.summary || undefined,
    alternates: { canonical: `/journal/${entry.slug}` },
    openGraph: {
      type: "article",
      title: entry.title,
      description: entry.summary || undefined,
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
          ...(entry.summary ? { description: entry.summary } : {}),
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
