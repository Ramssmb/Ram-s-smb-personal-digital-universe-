import type { Metadata } from "next";
import { FolderOpen, Plus } from "lucide-react";

import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState, Skeleton, Tag } from "@/components/ui/display";
import { Container, PageHeader, Section } from "@/components/ui/layout";
import { ExternalLink, TextLink } from "@/components/ui/text-link";
import { requireAdminPage } from "@/server/auth/guard";

import { InteractiveDemos } from "./interactive-demos";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/**
 * Living reference for every component in both themes (docs/DESIGN_SYSTEM.md).
 * Only the signed-in owner can open it. It shows no data.
 */
export default async function DesignSystemPage() {
  await requireAdminPage();

  return (
    <Container>
      <PageHeader
        eyebrow="Internal"
        title="Design system"
        description="Tokens and components, rendered with the current theme. Use the theme toggle in the header to check both."
      />

      <Section title="Color tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["canvas", "bg-canvas"],
            ["surface", "bg-surface"],
            ["surface-muted", "bg-surface-muted"],
            ["line", "bg-line"],
            ["fg", "bg-fg"],
            ["fg-muted", "bg-fg-muted"],
            ["accent", "bg-accent"],
            ["accent-soft", "bg-accent-soft"],
            ["success", "bg-success"],
            ["warning", "bg-warning"],
            ["danger", "bg-danger"],
            ["danger-soft", "bg-danger-soft"],
          ].map(([name, swatch]) => (
            <li key={name} className="flex flex-col gap-2">
              <div className={`h-16 rounded-[var(--radius-input)] border border-line ${swatch}`} />
              <span className="font-mono text-micro text-fg-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-6">
          <p className="text-display font-semibold">Display</p>
          <p className="text-h1 font-semibold">Heading 1</p>
          <p className="text-h2 font-semibold">Heading 2</p>
          <p className="text-h3 font-semibold">Heading 3</p>
          <p className="max-w-[68ch] text-body-lg text-fg-muted">
            Body large — used for introductions. Long-form text is capped at 68 characters per line
            to stay comfortable to read.
          </p>
          <p className="max-w-[68ch] text-body">
            Body — the default text size, with a line height of 1.6 for readability.
          </p>
          <p className="text-small text-fg-muted">Small — metadata and labels.</p>
          <p className="eyebrow">Eyebrow · micro mono</p>
        </div>
      </Section>

      <Section title="Buttons and links">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm" icon={<Plus aria-hidden="true" className="size-4" />}>
            Small with icon
          </Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Add item" variant="secondary">
            <Plus aria-hidden="true" className="size-4" />
          </IconButton>
          <ButtonLink href="/" variant="secondary">
            Button link
          </ButtonLink>
        </div>
        <p className="mt-6 flex flex-wrap gap-6 text-body">
          <TextLink href="/">Internal link</TextLink>
          <ExternalLink href="https://nextjs.org/docs" newTab>
            External link
          </ExternalLink>
          <ExternalLink href="javascript:alert(1)">Unsafe URL renders as text</ExternalLink>
        </p>
      </Section>

      <Section title="Badges and tags">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Draft</Badge>
          <Badge tone="accent">Featured</Badge>
          <Badge tone="success">Published</Badge>
          <Badge tone="warning">In progress</Badge>
          <Badge tone="danger">Archived</Badge>
          <Tag>typescript</Tag>
          <Tag>postgresql</Tag>
        </div>
      </Section>

      <Section title="Cards, alerts and states">
        <div className="grid gap-4 md:grid-cols-2">
          <Card interactive>
            <p className="eyebrow">Card</p>
            <h3 className="mt-2 text-h3 font-semibold">Interactive card</h3>
            <p className="mt-2 text-small text-fg-muted">
              Lifts slightly on hover. Used for collections of comparable items.
            </p>
          </Card>
          <Card>
            <div className="flex flex-col gap-3" role="status">
              <span className="sr-only">Loading example content</span>
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </Card>
        </div>
        <div className="mt-4 grid gap-3">
          <Alert title="Information">Neutral, helpful context.</Alert>
          <Alert tone="success" title="Saved">
            Your changes were saved.
          </Alert>
          <Alert tone="warning" title="Unsaved changes">
            Leave this page to discard them.
          </Alert>
          <Alert tone="danger" title="Could not publish">
            Add a summary first.
          </Alert>
        </div>
        <EmptyState
          className="mt-4"
          icon={<FolderOpen />}
          title="No projects yet"
          description="Projects you publish from the dashboard will appear here."
        />
      </Section>

      <InteractiveDemos />
    </Container>
  );
}
