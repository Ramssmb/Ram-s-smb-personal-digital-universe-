import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { FilterBar } from "@/components/public/filters";
import { Badge, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { SEARCH_TYPES, searchSite } from "@/server/content/public";
import { clientIpHash } from "@/server/security/client-ip";
import { hit, RULES } from "@/server/security/rate-limit";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

const TYPE_LABELS: Record<string, string> = {
  projects: "Projects",
  journal: "Journal",
  skills: "Skills",
  experience: "Experience",
  certifications: "Certifications",
  achievements: "Achievements",
  resources: "Resources",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type } = await searchParams;
  const query = q.trim().slice(0, 100);
  let limited = false;
  let results: Awaited<ReturnType<typeof searchSite>> = [];
  if (query.length >= 2) {
    // Searches are cheap but not free: cap them per client.
    limited = !(await hit(RULES.searchPerIp, clientIpHash(await headers()))).allowed;
    if (!limited) results = await searchSite(query, type);
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Search"
        title="Search the site"
        description="Projects, journal entries, skills, experience, achievements and resources."
      />
      <div className="py-8">
        <FilterBar
          action="/search"
          q={q}
          searchLabel="Search"
          selects={[
            {
              name: "type",
              label: "In",
              value: type,
              allLabel: "Everything",
              options: SEARCH_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t]! })),
            },
          ]}
        />
      </div>
      <div className="pb-16" aria-live="polite">
        {limited ? (
          <EmptyState title="Too many searches" description="Please wait a minute and try again." />
        ) : query.length < 2 ? (
          <p className="text-fg-muted">Type at least two characters to search.</p>
        ) : results.length === 0 ? (
          <EmptyState
            title={`No results for “${query}”`}
            description="Try a different word or search everything."
          />
        ) : (
          <>
            <p className="mb-4 text-small text-fg-muted">
              {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
            </p>
            <ul className="divide-y divide-line border-y border-line">
              {results.map((result) => (
                <li key={`${result.type}-${result.url}`} className="relative py-5">
                  <Badge>{TYPE_LABELS[result.type]}</Badge>
                  <h2 className="mt-2 text-body-lg font-semibold">
                    <Link
                      href={result.url as Route}
                      className="after:absolute after:inset-0 hover:text-accent"
                    >
                      {result.title}
                    </Link>
                  </h2>
                  {result.summary && (
                    <p className="mt-1 line-clamp-2 text-small text-fg-muted">{result.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Container>
  );
}
