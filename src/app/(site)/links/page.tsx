import { ArrowUpRight } from "lucide-react";

import { LinkIconGlyph } from "@/components/site/link-icon";
import { EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { LINK_KINDS, label } from "@/lib/content/enums";
import { listLinks } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("links", "/links", {
    title: "Links",
    description: "Profiles, coding platforms and other important links.",
  });
}

export default async function LinksPage() {
  const links = await listLinks();
  const groups = LINK_KINDS.map((kind) => ({
    kind,
    items: links.filter((l) => l.kind === kind),
  })).filter((g) => g.items.length);

  return (
    <Container width="prose">
      <PageHeader eyebrow="Links" title="Links" description="Where else to find me." />
      {groups.length === 0 ? (
        <EmptyState className="my-16" title="No links published yet" />
      ) : (
        <div className="flex flex-col gap-10 py-12">
          {groups.map((group) => (
            <section key={group.kind} aria-labelledby={`links-${group.kind}`}>
              <h2 id={`links-${group.kind}`} className="eyebrow">
                {label(group.kind)}
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {group.items.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel={link.relMe ? "me noopener noreferrer" : "noopener noreferrer"}
                      className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-surface-muted">
                        <LinkIconGlyph icon={link.icon} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{link.label}</span>
                        <span className="block truncate text-small text-fg-muted">
                          {link.description || new URL(link.url).host}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 text-fg-muted transition-colors group-hover:text-fg"
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
