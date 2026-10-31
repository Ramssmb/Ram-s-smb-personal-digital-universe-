import Link from "next/link";

import { Container } from "@/components/ui/layout";
import { allNav } from "@/config/navigation";

import { LinkIconGlyph } from "./link-icon";

interface FooterLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  relMe: boolean;
}

export function SiteFooter({ siteName, links }: { siteName: string | null; links: FooterLink[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line">
      <Container className="flex flex-col gap-10 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">
            {allNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-small text-fg-muted transition-colors hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/search"
              className="text-small text-fg-muted transition-colors hover:text-fg"
            >
              Search
            </Link>
            <a
              href="/journal/feed.xml"
              className="text-small text-fg-muted transition-colors hover:text-fg"
            >
              RSS feed
            </a>
          </nav>
          {links.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Profiles">
              {links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    rel={link.relMe ? "me noopener noreferrer" : "noopener noreferrer"}
                    aria-label={link.label}
                    title={link.label}
                    className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                  >
                    <LinkIconGlyph icon={link.icon} className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-small text-fg-muted">
          © {year}
          {siteName ? ` ${siteName}` : ""}
        </p>
      </Container>
    </footer>
  );
}
