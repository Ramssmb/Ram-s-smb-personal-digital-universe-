import Link from "next/link";

import { Container } from "@/components/ui/layout";
import type { NavItem } from "@/config/navigation";

import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ siteName, nav }: { siteName: string | null; nav: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="-mx-2 rounded-[var(--radius-button)] px-2 py-1 text-body font-semibold tracking-tight text-fg"
        >
          {siteName ?? "Home"}
        </Link>
        <div className="flex items-center gap-1">
          {nav.length > 0 && <DesktopNav items={nav} />}
          <ThemeToggle />
          {nav.length > 0 && <MobileNav items={nav} />}
        </div>
      </Container>
    </header>
  );
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-[var(--radius-button)] bg-accent px-4 py-2 text-small font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}
