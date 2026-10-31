import { Search } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { buttonClasses } from "@/components/ui/button";

export interface FilterSelect {
  name: string;
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  allLabel: string;
}

/**
 * Search and filters as a plain GET form: works without JavaScript, and the
 * URL can be shared or bookmarked.
 */
export function FilterBar({
  action,
  q,
  selects = [],
  searchLabel,
}: {
  action: string;
  q?: string;
  selects?: FilterSelect[];
  searchLabel: string;
}) {
  const active = Boolean(q) || selects.some((s) => s.value);
  return (
    <form
      method="get"
      action={action}
      role="search"
      className="flex flex-col gap-3 md:flex-row md:items-end"
    >
      <label className="flex flex-1 flex-col gap-1.5 text-small font-medium">
        {searchLabel}
        <span className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            className="h-11 w-full rounded-[var(--radius-input)] border border-line-strong bg-surface pr-3 pl-9 text-body font-normal"
          />
        </span>
      </label>
      {selects.map((select) => (
        <label key={select.name} className="flex flex-col gap-1.5 text-small font-medium">
          {select.label}
          <select
            name={select.name}
            defaultValue={select.value ?? ""}
            className="h-11 min-w-44 rounded-[var(--radius-input)] border border-line-strong bg-surface px-3 text-body font-normal"
          >
            <option value="">{select.allLabel}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <div className="flex gap-2">
        <button type="submit" className={buttonClasses("primary", "md")}>
          Apply
        </button>
        {active && (
          <Link href={action as Route} className={buttonClasses("ghost", "md")}>
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}

/** Previous/next page links that keep the current filters. */
export function Pagination({
  path,
  params,
  page,
  total,
  pageSize,
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (value && key !== "page") search.set(key, value);
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return (query ? `${path}?${query}` : path) as Route;
  };
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between text-small">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={buttonClasses("secondary", "sm")}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-fg-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={buttonClasses("secondary", "sm")}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
