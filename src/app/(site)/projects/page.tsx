import { FilterBar, Pagination } from "@/components/public/filters";
import { ProjectCard } from "@/components/public/content";
import { EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { PROJECT_STATUSES, label } from "@/lib/content/enums";
import { listCategories, listProjects } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("projects", "/projects", {
    title: "Projects",
    description: "Projects I have built and am building, with the problems they solve and how.",
  });
}

type Search = { q?: string; category?: string; status?: string; sort?: string; page?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = (PROJECT_STATUSES as readonly string[]).includes(params.status ?? "")
    ? params.status
    : undefined;
  const [result, categories] = await Promise.all([
    listProjects({ q: params.q, category: params.category, status, sort: params.sort, page }),
    listCategories("project"),
  ]);

  return (
    <Container>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Things I have built, including work in progress."
      />
      <div className="py-8">
        <FilterBar
          action="/projects"
          q={params.q}
          searchLabel="Search projects"
          selects={[
            ...(categories.length
              ? [
                  {
                    name: "category",
                    label: "Category",
                    value: params.category,
                    allLabel: "All categories",
                    options: categories.map((c) => ({ value: c.slug, label: c.name })),
                  },
                ]
              : []),
            {
              name: "status",
              label: "Status",
              value: status,
              allLabel: "Any status",
              options: PROJECT_STATUSES.map((s) => ({ value: s, label: label(s) })),
            },
            {
              name: "sort",
              label: "Sort by",
              value: params.sort,
              allLabel: "Featured first",
              options: [
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "title", label: "Title" },
              ],
            },
          ]}
        />
      </div>
      {result.items.length === 0 ? (
        <EmptyState
          className="mb-16"
          title={
            params.q || params.category || status
              ? "No projects match"
              : "No projects published yet"
          }
          description={params.q || params.category || status ? "Try different filters." : undefined}
        />
      ) : (
        <div className="pb-16">
          <p className="mb-6 text-small text-fg-muted" aria-live="polite">
            {result.total} project{result.total === 1 ? "" : "s"}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.items.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index < 3} />
            ))}
          </div>
          <Pagination
            path="/projects"
            params={{ ...params, status }}
            page={page}
            total={result.total}
            pageSize={result.pageSize}
          />
        </div>
      )}
    </Container>
  );
}
