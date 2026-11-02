import { Search } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { allNav, primaryNav, secondaryNav } from "@/config/navigation";

import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ siteName }: { siteName: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="-mx-2 truncate rounded-[var(--radius-button)] px-2 py-1 text-body font-semibold tracking-tight text-fg"
        >
          {siteName ?? "Home"}
        </Link>
        <div className="flex items-center gap-1">
          <DesktopNav items={primaryNav} more={secondaryNav} />
          <Link
            href="/search"
            aria-label="Search"
            title="Search"
            className={buttonClasses("ghost", "md", "w-11 px-0")}
          >
            <Search aria-hidden="true" className="size-[18px]" />
          </Link>
          <ThemeToggle />
          <Link href="/contact" className={buttonClasses("secondary", "sm", "ml-1 max-lg:hidden")}>
            Contact
          </Link>
          <MobileNav items={allNav} />
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
