import { FilterBar, Pagination } from "@/components/public/filters";
import { Prose, TagList } from "@/components/public/content";
import { Badge, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { ExternalLink } from "@/components/ui/text-link";
import { RESOURCE_KINDS, label } from "@/lib/content/enums";
import { formatDate } from "@/lib/format";
import { listCategories, listResources } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("resources", "/resources", {
    title: "Resources",
    description: "Documentation, courses, books, tools and websites I find useful, with notes.",
  });
}

type Search = { q?: string; category?: string; kind?: string; page?: string };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const kind = (RESOURCE_KINDS as readonly string[]).includes(params.kind ?? "")
    ? params.kind
    : undefined;
  const [result, categories] = await Promise.all([
    listResources({ q: params.q, category: params.category, kind, page }),
    listCategories("resource"),
  ]);

  return (
    <Container>
      <PageHeader
        eyebrow="Library"
        title="Resources"
        description="Material I learn from, with my own notes."
      />
      <div className="py-8">
        <FilterBar
          action="/resources"
          q={params.q}
          searchLabel="Search resources"
          selects={[
            {
              name: "category",
              label: "Topic",
              value: params.category,
              allLabel: "All topics",
              options: categories.map((c) => ({ value: c.slug, label: c.name })),
            },
            {
              name: "kind",
              label: "Type",
              value: kind,
              allLabel: "All types",
              options: RESOURCE_KINDS.map((k) => ({ value: k, label: label(k) })),
            },
          ]}
        />
      </div>
      {result.items.length === 0 ? (
        <EmptyState
          className="mb-16"
          title={
            params.q || params.category || kind
              ? "No resources match"
              : "No resources published yet"
          }
        />
      ) : (
        <div className="pb-16">
          <ul className="divide-y divide-line border-y border-line">
            {result.items.map((resource) => (
              <li
                key={resource.id}
                id={`r-${resource.id}`}
                className="flex scroll-mt-24 flex-col gap-2 py-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{label(resource.kind)}</Badge>
                  {resource.categoryName && (
                    <span className="text-small text-fg-muted">{resource.categoryName}</span>
                  )}
                  <span className="font-mono text-micro text-fg-muted">
                    Added {formatDate(resource.addedOn)}
                  </span>
                </div>
                <h2 className="text-h3 font-semibold">
                  {resource.url ? (
                    <ExternalLink href={resource.url} newTab unstyled className="hover:text-accent">
                      {resource.title}
                    </ExternalLink>
                  ) : (
                    resource.title
                  )}
                </h2>
                {resource.description && <p className="text-fg-muted">{resource.description}</p>}
                <Prose markdown={resource.notesMd} className="text-small" />
                <TagList items={resource.tags} label="Tags" />
              </li>
            ))}
          </ul>
          <Pagination
            path="/resources"
            params={{ ...params, kind }}
            page={page}
            total={result.total}
            pageSize={result.pageSize}
          />
        </div>
      )}
    </Container>
  );
}
