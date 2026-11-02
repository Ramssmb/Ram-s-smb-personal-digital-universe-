"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, EmptyState } from "@/components/ui/display";
import { Input } from "@/components/ui/input";

import { api, ApiError } from "./api";
import { MediaThumb, UploadButton } from "./media-picker";

interface Item {
  id: string;
  kind: string;
  access: string;
  altText: string;
  originalFilename: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function MediaCard({ item }: { item: Item }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/v1/admin/media/${item.id}`, {
        method: "PATCH",
        json: { altText: form.get("altText"), access: form.get("access") },
      });
      setMessage({ ok: true, text: "Saved." });
      router.refresh();
    } catch (thrown) {
      setMessage({
        ok: false,
        text: thrown instanceof ApiError ? thrown.message : "Could not save.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await api(`/api/v1/admin/media/${item.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function replace(file: File) {
    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.set("file", file);
    try {
      await api(`/api/v1/admin/media/${item.id}/file`, { method: "PUT", body });
      setMessage({ ok: true, text: "File replaced everywhere it is used." });
      router.refresh();
    } catch (thrown) {
      setMessage({
        ok: false,
        text: thrown instanceof ApiError ? thrown.message : "Could not replace the file.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <a
        href={`/api/v1/admin/media/${item.id}/file`}
        target="_blank"
        rel="noopener"
        className="block"
      >
        <MediaThumb
          media={item}
          className="aspect-video w-full rounded-md border border-line bg-surface-muted object-contain"
        />
        <span className="sr-only">Open {item.originalFilename} (opens in a new tab)</span>
      </a>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-small font-medium" title={item.originalFilename}>
          {item.originalFilename}
        </p>
        <Badge tone={item.access === "private" ? "warning" : "neutral"}>
          {item.access === "private" ? "Private" : "Public"}
        </Badge>
      </div>
      <p className="text-micro text-fg-muted">
        {formatBytes(item.byteSize)}
        {item.width ? ` · ${item.width}×${item.height}` : ""} · {item.createdAt.slice(0, 10)}
      </p>
      <form onSubmit={save} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-small font-medium">
          Alt text
          <Input name="altText" defaultValue={item.altText} maxLength={300} />
        </label>
        <label className="flex flex-col gap-1 text-small font-medium">
          Access
          <select
            name="access"
            defaultValue={item.access}
            className="h-11 rounded-[var(--radius-input)] border border-line-input bg-surface px-3 text-body"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Hidden file names give each card's controls a distinct accessible name. */}
          <Button type="submit" variant="secondary" size="sm" loading={busy}>
            Save<span className="sr-only"> details of {item.originalFilename}</span>
          </Button>
          {/* A visually styled label for the hidden input keeps it keyboard-reachable. */}
          <label
            className={buttonClasses(
              "ghost",
              "sm",
              "cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]",
            )}
          >
            Replace file<span className="sr-only"> {item.originalFilename}</span>
            <input
              type="file"
              className="sr-only"
              disabled={busy}
              accept={
                item.kind === "image"
                  ? "image/jpeg,image/png,image/webp,image/avif"
                  : "application/pdf"
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void replace(file);
                event.target.value = "";
              }}
            />
          </label>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                icon={<Trash2 aria-hidden="true" className="size-4" />}
              >
                Delete<span className="sr-only"> {item.originalFilename}</span>
              </Button>
            }
            title={`Delete ${item.originalFilename}?`}
            description="The file is removed permanently. Files still used by content cannot be deleted."
            confirmLabel="Delete file"
            onConfirm={remove}
          />
        </div>
        {message && (
          <p
            role="status"
            className={message.ok ? "text-small text-fg-muted" : "text-small text-danger"}
          >
            {message.text}
          </p>
        )}
      </form>
    </li>
  );
}

export function MediaLibrary({
  items,
  total,
  page,
  pageSize,
  query,
}: {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}) {
  const router = useRouter();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col gap-6">
      <UploadButton accept="any" onUploaded={() => router.refresh()} />
      <form method="get" role="search" className="flex gap-2">
        <label htmlFor="media-q" className="sr-only">
          Search files
        </label>
        <Input
          id="media-q"
          name="q"
          defaultValue={query}
          placeholder="Search by name or alt text"
        />
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Search
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState
          title={query ? "No files match" : "No files yet"}
          description="Upload images and PDFs above."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-small">
          {page > 1 ? (
            <Link
              href={`/admin/media?page=${page - 1}&q=${encodeURIComponent(query)}` as Route}
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
              href={`/admin/media?page=${page + 1}&q=${encodeURIComponent(query)}` as Route}
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
