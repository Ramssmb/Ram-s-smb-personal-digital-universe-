import { Plus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { buttonClasses } from "@/components/ui/button";
import { Alert, Badge, EmptyState } from "@/components/ui/display";
import { COLLECTIONS, isCollectionKey } from "@/lib/content/collections";
import { label } from "@/lib/content/enums";
import { requireAdminPage } from "@/server/auth/guard";
import { listItems } from "@/server/content/service";

type Params = {
  params: Promise<{ collection: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Params) {
  const { collection } = await params;
  return { title: isCollectionKey(collection) ? COLLECTIONS[collection].label : "Content" };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return label(String(value));
}

export default async function CollectionListPage({ params, searchParams }: Params) {
  await requireAdminPage();
  const { collection } = await params;
  if (!isCollectionKey(collection)) notFound();
  const def = COLLECTIONS[collection];
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const manual = def.order.kind === "manual";
  const result = await listItems(collection, {
    q: query.q,
    status: query.status,
    page,
    pageSize: manual ? 100 : 25,
  });
  const ids = result.items.map((item) => item.id as string);
  const canReorder = manual && !query.q && !query.status && result.total <= 100;
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const base = `/admin/content/${collection}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1 font-semibold">{def.label}</h1>
          <p className="mt-2 max-w-2xl text-fg-muted">{def.description}</p>
        </div>
        <Link href={`${base}/new` as Route} className={buttonClasses("primary", "md")}>
          <Plus aria-hidden="true" className="size-4" />
          New {def.singular.toLowerCase()}
        </Link>
      </header>

      {query.deleted && <Alert tone="success" title="Deleted." />}

      <form method="get" className="flex flex-col gap-3 sm:flex-row" role="search">
        <label className="sr-only" htmlFor="q">
          Search {def.label.toLowerCase()}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query.q}
          placeholder={`Search ${def.label.toLowerCase()}…`}
          className="h-11 flex-1 rounded-[var(--radius-input)] border border-line-input bg-surface px-3"
        />
        {def.publishable && (
          <>
            <label className="sr-only" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={query.status ?? ""}
              className="h-11 rounded-[var(--radius-input)] border border-line-input bg-surface px-3"
            >
              <option value="">All statuses</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </>
        )}
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title={
            query.q || query.status
              ? "Nothing matches these filters"
              : `No ${def.label.toLowerCase()} yet`
          }
          description={
            query.q || query.status
              ? "Try a different search."
              : "Create the first one to get started."
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {result.items.map((item, index) => {
            const title = String(item[def.titleField] ?? "Untitled");
            const subtitle = (def.subtitleFields ?? [])
              .map((f) => formatValue(item[f]))
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={item.id as string} className="flex items-center gap-3 px-4 py-3">
                {canReorder && (
                  <ReorderButtons collection={collection} ids={ids} index={index} title={title} />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${base}/${item.id as string}` as Route}
                    className="block truncate font-medium hover:text-accent"
                  >
                    {title}
                  </Link>
                  {subtitle && <p className="truncate text-small text-fg-muted">{subtitle}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {Boolean(item.isFeatured) && <Badge tone="accent">Featured</Badge>}
                  {item.visibility === "private" && <Badge>Private</Badge>}
                  {def.publishable && (
                    <Badge
                      tone={
                        item.status === "published"
                          ? "success"
                          : item.status === "archived"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {label(item.status as string)}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-small">
          {page > 1 ? (
            <Link
              href={
                `${base}?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.status ? { status: query.status } : {}), page: String(page - 1) })}` as Route
              }
              className={buttonClasses("secondary", "sm")}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-fg-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={
                `${base}?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.status ? { status: query.status } : {}), page: String(page + 1) })}` as Route
              }
              className={buttonClasses("secondary", "sm")}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
