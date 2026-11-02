"use client";

import { ArrowDown, ArrowUp, FileText, ImagePlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { api, ApiError } from "./api";

export interface MediaSummary {
  id: string;
  kind: string;
  access: string;
  altText: string;
  originalFilename: string;
}

interface MediaListResponse {
  items: MediaSummary[];
  total: number;
}

export function MediaThumb({ media, className }: { media: MediaSummary; className?: string }) {
  if (media.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin preview of an already-optimized upload
      <img
        src={`/api/v1/admin/media/${media.id}/file`}
        alt={media.altText || media.originalFilename}
        className={className ?? "size-20 rounded-md border border-line object-cover"}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={
        className ??
        "flex size-20 items-center justify-center rounded-md border border-line bg-surface-muted"
      }
    >
      <FileText aria-hidden="true" className="size-6 text-fg-muted" />
      <span className="sr-only">{media.originalFilename}</span>
    </div>
  );
}

/** Upload input used by the picker and the media library. */
export function UploadButton({
  accept,
  onUploaded,
  defaultAccess = "public",
}: {
  accept: "image" | "document" | "any";
  onUploaded: (media: MediaSummary) => void;
  defaultAccess?: "public" | "private";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [access, setAccess] = useState(defaultAccess);
  const mime =
    accept === "image"
      ? "image/jpeg,image/png,image/webp,image/avif"
      : accept === "document"
        ? "application/pdf"
        : "image/jpeg,image/png,image/webp,image/avif,application/pdf";

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("access", access);
    body.set("altText", altText);
    try {
      const { item } = await api<{ item: MediaSummary }>("/api/v1/admin/media", { body });
      setAltText("");
      onUploaded(item);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-input)] border border-dashed border-line-strong p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-1.5 text-small font-medium">
          Alt text (describe the image for screen readers)
          <Input value={altText} onChange={(e) => setAltText(e.target.value)} maxLength={300} />
        </label>
        <label className="flex flex-col gap-1.5 text-small font-medium">
          Access
          <select
            value={access}
            onChange={(e) => setAccess(e.target.value as "public" | "private")}
            className="h-11 rounded-[var(--radius-input)] border border-line-input bg-surface px-3 text-body"
          >
            <option value="public">Public</option>
            <option value="private">Private (dashboard only)</option>
          </select>
        </label>
      </div>
      <label className="inline-flex">
        <span className="sr-only">Choose a file to upload</span>
        <input
          type="file"
          accept={mime}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
          className="text-small file:mr-3 file:h-9 file:rounded-[var(--radius-button)] file:border file:border-line-strong file:bg-surface file:px-3 file:text-small file:font-medium"
        />
      </label>
      <p className="text-small text-fg-muted" aria-live="polite">
        {busy ? "Uploading…" : "JPEG, PNG, WebP, AVIF up to 10 MB; PDF up to 15 MB."}
      </p>
      {error && (
        <p role="alert" className="text-small font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function PickerDialog({
  open,
  onOpenChange,
  accept,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accept: "image" | "document" | "any";
  onPick: (media: MediaSummary) => void;
}) {
  const [items, setItems] = useState<MediaSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const kind = accept === "any" ? "" : `&kind=${accept}`;
      const result = await api<MediaListResponse>(
        `/api/v1/admin/media?q=${encodeURIComponent(query)}${kind}`,
      );
      setItems(result.items);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not load files.");
    } finally {
      setLoading(false);
    }
  }, [accept, query]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Choose a file" className="max-w-3xl">
      <div className="flex flex-col gap-4 pb-2">
        <UploadButton accept={accept} onUploaded={(media) => onPick(media)} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or alt text"
          aria-label="Search files"
        />
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {loading ? "Loading files" : `${items.length} files`}
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((media) => (
            <li key={media.id}>
              <button
                type="button"
                onClick={() => onPick(media)}
                className="flex w-full flex-col gap-1.5 rounded-md p-1 text-left hover:bg-surface-muted"
              >
                <MediaThumb
                  media={media}
                  className="aspect-square w-full rounded-md border border-line object-cover"
                />
                <span className="truncate text-micro text-fg-muted">
                  {media.access === "private" ? "🔒 " : ""}
                  {media.altText || media.originalFilename}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!loading && items.length === 0 && (
          <p className="text-small text-fg-muted">No files yet. Upload one above.</p>
        )}
      </div>
    </Dialog>
  );
}

/** Single file field. */
export function MediaField({
  accept,
  value,
  media,
  onChange,
}: {
  accept: "image" | "document" | "any";
  value: string | null;
  media: Record<string, MediaSummary>;
  onChange: (id: string | null, media?: MediaSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? media[value] : undefined;
  return (
    <div className="flex items-center gap-4">
      {selected ? <MediaThumb media={selected} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
          icon={<ImagePlus aria-hidden="true" className="size-4" />}
        >
          {value ? "Replace" : "Choose file"}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      {selected && (
        <p className="text-small text-fg-muted">
          {selected.access === "private" ? "Private file · " : ""}
          {selected.altText
            ? `Alt: ${selected.altText}`
            : selected.kind === "image"
              ? "No alt text yet"
              : selected.originalFilename}
        </p>
      )}
      <PickerDialog
        open={open}
        onOpenChange={setOpen}
        accept={accept}
        onPick={(picked) => {
          onChange(picked.id, picked);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Ordered list of images (screenshots, journal images). */
export function MediaListField({
  accept = "image",
  value,
  media,
  onChange,
}: {
  accept?: "image" | "any";
  value: string[];
  media: Record<string, MediaSummary>;
  onChange: (ids: string[], added?: MediaSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  function move(index: number, delta: number) {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ol className="flex flex-col gap-2">
          {value.map((id, index) => {
            const item = media[id];
            return (
              <li key={id} className="flex items-center gap-3 rounded-md border border-line p-2">
                {item && (
                  <MediaThumb
                    media={item}
                    className="size-14 rounded border border-line object-cover"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-small">
                  {item?.altText || item?.originalFilename || "File"}
                </span>
                <IconButton
                  label="Move up"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </IconButton>
                <IconButton
                  label="Move down"
                  variant="ghost"
                  size="sm"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </IconButton>
                <IconButton
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                >
                  <X aria-hidden="true" className="size-4" />
                </IconButton>
              </li>
            );
          })}
        </ol>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => setOpen(true)}
        icon={<ImagePlus aria-hidden="true" className="size-4" />}
      >
        {accept === "image" ? "Add image" : "Add file"}
      </Button>
      <PickerDialog
        open={open}
        onOpenChange={setOpen}
        accept={accept}
        onPick={(picked) => {
          if (!value.includes(picked.id)) onChange([...value, picked.id], picked);
          setOpen(false);
        }}
      />
    </div>
  );
}
