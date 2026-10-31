"use client";

import { Plus, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { api, ApiError } from "./api";

export interface Option {
  id: string;
  name: string;
}

/**
 * Multi-select with filtering. For tags, a missing tag can be created inline.
 * Keyboard: type to filter, Tab to the options, Space to toggle.
 */
export function RelationPicker({
  label,
  options,
  value,
  onChange,
  allowCreate,
  describedBy,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  allowCreate?: boolean;
  describedBy?: string;
}) {
  const [query, setQuery] = useState("");
  const [extra, setExtra] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const listId = useId();
  const all = useMemo(() => [...options, ...extra], [options, extra]);
  const byId = useMemo(() => new Map(all.map((o) => [o.id, o])), [all]);
  const filtered = all
    .filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 60);
  const exact = all.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  async function create() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const { item } = await api<{ item: { id: string; name: string } }>(
        "/api/v1/admin/collections/tags",
        {
          json: { name },
        },
      );
      setExtra((current) => [...current, { id: item.id, name: item.name }]);
      onChange([...value, item.id]);
      setQuery("");
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not create the tag.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-input)] border border-line-strong p-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-small text-accent"
              >
                {byId.get(id)?.name ?? "Unknown"}
                <X aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(remove)</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${label.toLowerCase()}…`}
          aria-label={`Filter ${label.toLowerCase()}`}
          aria-describedby={describedBy}
          aria-controls={listId}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (allowCreate && query.trim() && !exact) void create();
            }
          }}
        />
        {allowCreate && query.trim() && !exact && (
          <Button
            variant="secondary"
            onClick={create}
            loading={creating}
            icon={<Plus aria-hidden="true" className="size-4" />}
          >
            Create
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div id={listId} className="flex max-h-48 flex-col overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-small text-fg-muted">
            {all.length === 0 ? `No ${label.toLowerCase()} yet.` : "No matches."}
          </p>
        ) : (
          filtered.map((option) => (
            <label
              key={option.id}
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-1 text-small hover:bg-surface-muted"
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={value.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              {option.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
