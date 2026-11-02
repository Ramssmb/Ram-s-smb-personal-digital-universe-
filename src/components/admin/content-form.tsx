"use client";

import { Eye, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button, IconButton, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert, Badge } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Checkbox, Switch } from "@/components/ui/toggles";
import { label as enumLabel } from "@/lib/content/enums";
import type { FieldDef } from "@/lib/content/fields";

import { api, ApiError } from "./api";
import { MediaField, MediaListField, type MediaSummary } from "./media-picker";
import { RelationPicker, type Option } from "./relation-picker";

export interface FormOptions {
  categories: (Option & { scope: string })[];
  skills: Option[];
  tags: Option[];
}

type Values = Record<string, unknown>;

/** Converts stored values to what the inputs edit (null → "", numbers → strings). */
function toFormValues(fields: FieldDef[], initial: Values): Values {
  const values: Values = {};
  for (const field of fields) {
    const raw = initial[field.name];
    switch (field.kind) {
      case "boolean":
        values[field.name] = Boolean(raw);
        break;
      case "string-list":
        values[field.name] = Array.isArray(raw) ? (raw as string[]).join("\n") : "";
        break;
      case "link-list":
      case "relation-many":
      case "media-many":
        values[field.name] = Array.isArray(raw) ? raw : [];
        break;
      case "media":
        values[field.name] = raw ?? null;
        break;
      default:
        values[field.name] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return values;
}

/** Converts form values to the API payload. */
function toPayload(fields: FieldDef[], values: Values): Values {
  const payload: Values = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.kind === "string-list") {
      payload[field.name] = String(value ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } else if (field.kind === "link-list") {
      payload[field.name] = (value as { label: string; url: string }[]).filter(
        (l) => l.label.trim() || l.url.trim(),
      );
    } else {
      payload[field.name] = value;
    }
  }
  return payload;
}

export interface ContentFormProps {
  fields: FieldDef[];
  initial: Values;
  options: FormOptions;
  media: Record<string, MediaSummary>;
  /** "create" posts to the collection; "edit" patches an item; "singleton" puts a whole object. */
  mode: "create" | "edit" | "singleton";
  endpoint: string;
  collection?: string;
  singular?: string;
  publishable?: boolean;
  previewPath?: string | null;
  publicPath?: string | null;
}

export function ContentForm(props: ContentFormProps) {
  const { fields, options, mode, endpoint } = props;
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => toFormValues(fields, props.initial));
  const [saved, setSaved] = useState<Values>(() => toFormValues(fields, props.initial));
  const [media, setMedia] = useState(props.media);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    updatedAt: props.initial.updatedAt
      ? new Date(props.initial.updatedAt as string).toISOString()
      : undefined,
    status: (props.initial.status as string) ?? "draft",
    visibility: (props.initial.visibility as string) ?? "public",
    isFeatured: Boolean(props.initial.isFeatured),
  });
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: "" }));
  }

  function showError(thrown: unknown) {
    if (thrown instanceof ApiError) {
      // Nested keys such as "links.0.url" are shown on their top-level field.
      const collapsed: Record<string, string> = {};
      for (const [key, text] of Object.entries(thrown.fields))
        collapsed[key.split(".")[0]!] ??= text;
      setErrors(collapsed);
      setMessage({ tone: "danger", text: thrown.message });
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
        first?.focus();
      });
    } else {
      setMessage({ tone: "danger", text: "Something went wrong. Try again." });
    }
  }

  function applyItem(item: Values) {
    const next = toFormValues(fields, item);
    setValues(next);
    setSaved(next);
    setMeta({
      updatedAt: item.updatedAt ? new Date(item.updatedAt as string).toISOString() : undefined,
      status: (item.status as string) ?? "draft",
      visibility: (item.visibility as string) ?? "public",
      isFeatured: Boolean(item.isFeatured),
    });
  }

  async function save(): Promise<boolean> {
    setBusy("save");
    setErrors({});
    setMessage(null);
    const data = toPayload(fields, values);
    try {
      if (mode === "create") {
        const { item } = await api<{ item: Values }>(endpoint, { json: data });
        setSaved(values);
        router.push(`/admin/content/${props.collection}/${item.id as string}?created=1` as never);
        return true;
      }
      if (mode === "singleton") {
        const { item } = await api<{ item: Values }>(endpoint, { method: "PUT", json: data });
        applyItem(item);
      } else {
        const { item } = await api<{ item: Values }>(endpoint, {
          method: "PATCH",
          json: { data, updatedAt: meta.updatedAt },
        });
        applyItem(item);
      }
      setMessage({ tone: "success", text: "Saved." });
      router.refresh();
      return true;
    } catch (thrown) {
      showError(thrown);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function transition(action: "publish" | "unpublish" | "archive") {
    if (dirty && !(await save())) return;
    setBusy(action);
    setMessage(null);
    try {
      const { item } = await api<{ item: Values }>(`${endpoint}/${action}`, { method: "POST" });
      applyItem(item);
      setMessage({
        tone: "success",
        text:
          action === "publish"
            ? "Published. It is now visible on the site."
            : action === "archive"
              ? "Archived."
              : "Moved back to draft.",
      });
      router.refresh();
    } catch (thrown) {
      showError(thrown);
    } finally {
      setBusy(null);
    }
  }

  async function updateFlags(flags: { visibility?: string; isFeatured?: boolean }) {
    setBusy("flags");
    try {
      const { item } = await api<{ item: Values }>(`${endpoint}/flags`, { json: flags });
      setMeta((current) => ({
        ...current,
        updatedAt: new Date(item.updatedAt as string).toISOString(),
        visibility: item.visibility as string,
        isFeatured: Boolean(item.isFeatured),
      }));
      router.refresh();
    } catch (thrown) {
      showError(thrown);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    await api(endpoint, { method: "DELETE" });
    setSaved(values);
    router.push(`/admin/content/${props.collection}?deleted=1` as never);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void save();
  }

  const statusTone =
    meta.status === "published" ? "success" : meta.status === "archived" ? "danger" : "neutral";
  const live = meta.status === "published" && meta.visibility === "public";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {message && <Alert tone={message.tone} title={message.text} />}
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            options={options}
            media={media}
            onChange={(value, added) => {
              if (added) setMedia((current) => ({ ...current, [added.id]: added }));
              set(field.name, value);
            }}
          />
        ))}
        {errors.media && <Alert tone="danger" title={errors.media} />}
      </div>

      <aside
        aria-label="Save and publish"
        className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start"
      >
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <Button
            type="submit"
            loading={busy === "save"}
            disabled={busy !== null && busy !== "save"}
          >
            {mode !== "create" ? "Save changes" : props.publishable ? "Create draft" : "Create"}
          </Button>
          <p className="text-small text-fg-muted" aria-live="polite">
            {dirty
              ? "Unsaved changes"
              : mode !== "create"
                ? "All changes saved"
                : props.publishable
                  ? "New items start as drafts."
                  : "Takes effect as soon as it is created."}
          </p>
        </div>

        {mode === "edit" && props.publishable && (
          <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-small font-medium">Status</span>
              <Badge tone={statusTone}>{enumLabel(meta.status)}</Badge>
            </div>
            <p className="text-small text-fg-muted">
              {live ? "Visible to visitors." : "Not visible to visitors."}
            </p>
            {meta.status !== "published" ? (
              <Button
                variant="primary"
                onClick={() => transition("publish")}
                loading={busy === "publish"}
                disabled={busy !== null}
              >
                Publish
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => transition("unpublish")}
                loading={busy === "unpublish"}
                disabled={busy !== null}
              >
                Unpublish
              </Button>
            )}
            {meta.status !== "archived" && (
              <Button
                variant="ghost"
                onClick={() => transition("archive")}
                loading={busy === "archive"}
                disabled={busy !== null}
              >
                Archive
              </Button>
            )}
            <label className="flex flex-col gap-1.5 text-small font-medium">
              Visibility
              <select
                value={meta.visibility}
                disabled={busy !== null}
                onChange={(event) => void updateFlags({ visibility: event.target.value })}
                className="h-11 rounded-[var(--radius-input)] border border-line-input bg-surface px-3 text-body"
              >
                <option value="public">Public</option>
                <option value="private">Private (never shown publicly)</option>
              </select>
            </label>
            <Switch
              label="Featured"
              description="Highlight on the home page."
              checked={meta.isFeatured}
              disabled={busy !== null}
              onCheckedChange={(checked) => void updateFlags({ isFeatured: checked })}
            />
            <div className="flex flex-wrap gap-2">
              {props.previewPath && (
                <a
                  href={props.previewPath}
                  target="_blank"
                  rel="noopener"
                  className={buttonClasses("secondary", "sm")}
                >
                  <Eye aria-hidden="true" className="size-4" />
                  Preview<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {live && props.publicPath && (
                <a
                  href={props.publicPath}
                  target="_blank"
                  rel="noopener"
                  className={buttonClasses("ghost", "sm")}
                >
                  View live<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        )}

        {mode === "edit" && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                className="text-danger"
                icon={<Trash2 aria-hidden="true" className="size-4" />}
              >
                Delete permanently
              </Button>
            }
            title={`Delete this ${props.singular?.toLowerCase() ?? "item"}?`}
            description="This cannot be undone. Archive it instead to keep it out of sight but recoverable."
            confirmLabel="Delete permanently"
            onConfirm={remove}
          />
        )}
      </aside>
    </form>
  );
}

function FieldInput({
  field,
  value,
  error,
  options,
  media,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
  options: FormOptions;
  media: Record<string, MediaSummary>;
  onChange: (value: unknown, added?: MediaSummary) => void;
}) {
  const required = "required" in field && Boolean(field.required);
  const common = { label: field.label, hint: field.hint, error: error || undefined, required };

  switch (field.kind) {
    case "text":
    case "slug":
      return (
        <Field
          {...common}
          hint={
            field.kind === "slug"
              ? (field.hint ?? "Leave empty to generate it from the title.")
              : field.hint
          }
        >
          <Input
            name={field.name}
            value={String(value ?? "")}
            maxLength={field.kind === "text" ? field.max : 80}
            placeholder={field.kind === "text" ? field.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "url":
      return (
        <Field {...common}>
          <Input
            name={field.name}
            type="url"
            inputMode="url"
            value={String(value ?? "")}
            placeholder="https://"
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "email":
      return (
        <Field {...common}>
          <Input
            name={field.name}
            type="email"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "date":
      return (
        <Field {...common}>
          <Input
            name={field.name}
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="max-w-56"
          />
        </Field>
      );
    case "integer":
      return (
        <Field {...common}>
          <Input
            name={field.name}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="max-w-40"
          />
        </Field>
      );
    case "textarea":
      return (
        <Field {...common}>
          <Textarea
            name={field.name}
            rows={field.rows ?? 4}
            maxLength={field.max}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "markdown":
      return (
        <Field {...common}>
          <Textarea
            name={field.name}
            rows={field.rows ?? 8}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-small"
          />
        </Field>
      );
    case "string-list":
      return (
        <Field {...common}>
          <Textarea
            name={field.name}
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case "select":
      return (
        <Field {...common}>
          <Select
            name={field.name}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            {!field.required && <option value="">Not set</option>}
            {field.options.map((option) => (
              <option key={option} value={option}>
                {enumLabel(option)}
              </option>
            ))}
          </Select>
        </Field>
      );
    case "boolean":
      return (
        <Checkbox
          name={field.name}
          label={field.label}
          description={field.hint}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "category": {
      const choices = options.categories.filter((c) => c.scope === field.scope);
      return (
        <Field
          {...common}
          hint={
            field.hint ??
            (choices.length ? undefined : "No categories yet. Add them under Library → Categories.")
          }
        >
          <Select
            name={field.name}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">No category</option>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      );
    }
    case "relation-many":
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-small font-medium">{field.label}</legend>
          <RelationPicker
            label={field.label}
            options={field.target === "skills" ? options.skills : options.tags}
            value={(value as string[]) ?? []}
            onChange={onChange}
            allowCreate={field.target === "tags"}
          />
          {field.hint && <p className="text-small text-fg-muted">{field.hint}</p>}
          {error && <p className="text-small font-medium text-danger">{error}</p>}
        </fieldset>
      );
    case "media":
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-small font-medium">{field.label}</legend>
          <MediaField
            accept={field.accept}
            value={(value as string | null) ?? null}
            media={media}
            onChange={(id, added) => onChange(id, added)}
          />
          {field.hint && <p className="text-small text-fg-muted">{field.hint}</p>}
          {error && <p className="text-small font-medium text-danger">{error}</p>}
        </fieldset>
      );
    case "media-many":
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-small font-medium">{field.label}</legend>
          <MediaListField
            accept={field.accept}
            value={(value as string[]) ?? []}
            media={media}
            onChange={(ids, added) => onChange(ids, added)}
          />
          {field.hint && <p className="text-small text-fg-muted">{field.hint}</p>}
          {error && <p className="text-small font-medium text-danger">{error}</p>}
        </fieldset>
      );
    case "link-list": {
      const links = (value as { label: string; url: string }[]) ?? [];
      const update = (index: number, key: "label" | "url", next: string) =>
        onChange(links.map((link, i) => (i === index ? { ...link, [key]: next } : link)));
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-small font-medium">{field.label}</legend>
          {links.map((link, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input
                aria-label={`Link ${index + 1} label`}
                placeholder="Label"
                value={link.label}
                onChange={(e) => update(index, "label", e.target.value)}
              />
              <Input
                aria-label={`Link ${index + 1} URL`}
                type="url"
                placeholder="https://"
                value={link.url}
                onChange={(e) => update(index, "url", e.target.value)}
              />
              <IconButton
                label={`Remove link ${index + 1}`}
                variant="ghost"
                onClick={() => onChange(links.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => onChange([...links, { label: "", url: "" }])}
          >
            Add link
          </Button>
          {error && <p className="text-small font-medium text-danger">{error}</p>}
          {field.hint && <p className="text-small text-fg-muted">{field.hint}</p>}
        </fieldset>
      );
    }
  }
}
