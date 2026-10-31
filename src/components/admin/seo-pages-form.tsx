"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { label } from "@/lib/content/enums";

import { api, ApiError } from "./api";

type Pages = Record<string, { title: string | null; description: string | null }>;

function PageRow({
  pageKey,
  initial,
}: {
  pageKey: string;
  initial: { title: string | null; description: string | null };
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setStatus(null);
    try {
      await api(`/api/v1/admin/seo/${pageKey}`, {
        method: "PUT",
        json: { title: form.get("title"), description: form.get("description") },
      });
      setStatus({ ok: true, text: "Saved." });
    } catch (thrown) {
      setStatus({
        ok: false,
        text: thrown instanceof ApiError ? thrown.message : "Could not save.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 md:grid-cols-[140px_1fr_2fr_auto] md:items-end"
    >
      <p className="font-medium md:pb-3">{label(pageKey)}</p>
      <Field label="Title">
        <Input name="title" defaultValue={initial.title ?? ""} maxLength={70} />
      </Field>
      <Field label="Description">
        <Textarea
          name="description"
          defaultValue={initial.description ?? ""}
          maxLength={160}
          rows={2}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <Button type="submit" variant="secondary" loading={busy}>
          Save
        </Button>
        <p
          role="status"
          className={status?.ok === false ? "text-small text-danger" : "text-small text-fg-muted"}
        >
          {status?.text}
        </p>
      </div>
    </form>
  );
}

export function SeoPagesForm({ pages }: { pages: Pages }) {
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(pages).map(([key, value]) => (
        <PageRow key={key} pageKey={key} initial={value} />
      ))}
    </div>
  );
}
