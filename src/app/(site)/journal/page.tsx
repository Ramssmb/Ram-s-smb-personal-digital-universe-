import Link from "next/link";
import type { Route } from "next";

import { JournalItem } from "@/components/public/content";
import { FilterBar, Pagination } from "@/components/public/filters";
import { EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { cn } from "@/lib/cn";
import { formatMonthKey } from "@/lib/format";
import { journalMonths, journalTags, listJournal } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("journal", "/journal", {
    title: "Journal",
    description: "A dated log of what I learn, build and solve.",
  });
}

type Search = { q?: string; tag?: string; month?: string; page?: string };

export default async function JournalPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month : undefined;
  const [result, months, tags] = await Promise.all([
    listJournal({ q: params.q, tag: params.tag, month, page }),
    journalMonths(),
    journalTags(),
  ]);

  // Group the visible entries by month for the timeline.
  const groups = new Map<string, typeof result.items>();
  for (const entry of result.items) {
    const key = entry.entryDate.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Learning journal"
        title="Journal"
        description={
          <>
            What I learn, build and solve, as it happens.{" "}
            <a
              href="/journal/feed.xml"
              className="font-medium text-accent underline underline-offset-2"
            >
              Subscribe via RSS
            </a>
          </>
        }
      />
      <div className="py-8">
        <FilterBar
          action="/journal"
          q={params.q}
          searchLabel="Search the journal"
          selects={[
            ...(tags.length
              ? [
                  {
                    name: "tag",
                    label: "Tag",
                    value: params.tag,
                    allLabel: "All tags",
                    options: tags.map((t) => ({ value: t.slug, label: t.name })),
                  },
                ]
              : []),
            ...(months.length
              ? [
                  {
                    name: "month",
                    label: "Month",
                    value: month,
                    allLabel: "All months",
                    options: months.map((m) => ({
                      value: m.month,
                      label: formatMonthKey(m.month),
                    })),
                  },
                ]
              : []),
          ]}
        />
      </div>
      <div className="grid gap-12 pb-16 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0">
          {result.items.length === 0 ? (
            <EmptyState
              title={
                params.q || params.tag || month
                  ? "No entries match"
                  : "No journal entries published yet"
              }
            />
          ) : (
            <>
              {[...groups.entries()].map(([key, entries]) => (
                <section key={key} aria-labelledby={`month-${key}`} className="mb-6">
                  <h2
                    id={`month-${key}`}
                    className="sticky top-16 z-10 border-b border-line bg-canvas/90 py-3 text-small font-semibold backdrop-blur"
                  >
                    {formatMonthKey(key)}
                  </h2>
                  <div className="divide-y divide-line">
                    {entries.map((entry) => (
                      <JournalItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                </section>
              ))}
              <Pagination
                path="/journal"
                params={{ ...params, month }}
                page={page}
                total={result.total}
                pageSize={result.pageSize}
              />
            </>
          )}
        </div>
        {months.length > 0 && (
          <aside aria-labelledby="archive-heading" className="hidden lg:block">
            <h2 id="archive-heading" className="eyebrow">
              Archive
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {months.map((m) => (
                <li key={m.month}>
                  <Link
                    href={`/journal?month=${m.month}` as Route}
                    aria-current={month === m.month ? "page" : undefined}
                    className={cn(
                      "flex justify-between rounded-md px-2 py-1.5 text-small transition-colors hover:bg-surface-muted",
                      month === m.month ? "font-medium text-accent" : "text-fg-muted",
                    )}
                  >
                    {formatMonthKey(m.month)}
                    <span>{m.entries}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </Container>
  );
}
