import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalArticle } from "@/components/public/articles";
import { JsonLd } from "@/components/public/content";
import { journalExcerpt } from "@/lib/format";
import { getIdentity, getJournalEntry } from "@/server/content/public";
import { absoluteUrl, shareImageUrl, socialMetadata } from "@/server/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = await getJournalEntry((await params).slug);
  // Render the regular 404 page (with its own metadata), not an error shell.
  if (!entry) notFound();
  const description = journalExcerpt(entry);
  return {
    title: entry.title,
    description,
    ...(await socialMetadata({
      title: entry.title,
      description,
      path: `/journal/${entry.slug}`,
      type: "article",
      // The entry's first image; the default sharing image otherwise.
      image: entry.images[0] ?? null,
      publishedTime: entry.entryDate,
      modifiedTime: entry.updatedAt.toISOString(),
    })),
  };
}

export default async function JournalEntryPage({ params }: Params) {
  const entry = await getJournalEntry((await params).slug);
  if (!entry) notFound();
  const { profile, ogImage } = await getIdentity();
  const image = entry.images[0] ?? ogImage;
  const description = journalExcerpt(entry);
  const url = absoluteUrl(`/journal/${entry.slug}`);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: entry.title,
          ...(description ? { description } : {}),
          datePublished: entry.entryDate,
          dateModified: entry.updatedAt.toISOString(),
          url,
          mainEntityOfPage: url,
          ...(image ? { image: absoluteUrl(shareImageUrl(image)) } : {}),
          ...(entry.tags.length ? { keywords: entry.tags.map((t) => t.name).join(", ") } : {}),
          ...(profile.displayName
            ? { author: { "@type": "Person", name: profile.displayName, url: absoluteUrl("/") } }
            : {}),
        }}
      />
      <JournalArticle entry={entry} />
    </>
  );
}
