"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Section } from "@/components/ui/layout";
import { Checkbox, Switch } from "@/components/ui/toggles";

/** Interactive parts of the design gallery. Nothing here is persisted. */
export function InteractiveDemos() {
  const [featured, setFeatured] = useState(true);
  const [deleted, setDeleted] = useState(false);

  return (
    <>
      <Section title="Forms">
        <form className="grid max-w-xl gap-5" onSubmit={(event) => event.preventDefault()}>
          <Field label="Title" hint="Shown as the page heading." required>
            <Input name="title" placeholder="Project title" />
          </Field>
          <Field label="Slug" error="This slug is already used by another project.">
            <Input name="slug" defaultValue="my-project" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Summary" hint="Up to 280 characters.">
            <Textarea name="summary" rows={3} />
          </Field>
          <Checkbox
            name="public"
            label="Visible to the public"
            description="Private items stay in the dashboard only."
            defaultChecked
          />
          <Switch
            label="Featured"
            description="Show on the home page."
            checked={featured}
            onCheckedChange={setFeatured}
          />
        </form>
      </Section>

      <Section title="Dialogs">
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmDialog
            trigger={
              <Button variant="danger" icon={<Trash2 aria-hidden="true" className="size-4" />}>
                Delete permanently
              </Button>
            }
            title="Delete this item?"
            description="This cannot be undone."
            confirmLabel="Delete"
            onConfirm={async () => {
              await new Promise((resolve) => setTimeout(resolve, 600));
              setDeleted(true);
            }}
          />
          <p role="status" className="text-small text-fg-muted">
            {deleted ? "Demo item deleted." : "Demo item exists."}
          </p>
        </div>
      </Section>
    </>
  );
}
