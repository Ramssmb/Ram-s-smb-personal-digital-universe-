"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { ExternalLink as ExternalIcon, LogOut, Menu, PenLine, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button, IconButton, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { api } from "./api";

interface NavGroup {
  label: string;
  items: { label: string; href: string; badge?: number }[];
}

function groups(newMessages: number): NavGroup[] {
  return [
    { label: "", items: [{ label: "Overview", href: "/admin" }] },
    {
      label: "Content",
      items: [
        { label: "Profile", href: "/admin/profile" },
        { label: "About sections", href: "/admin/content/about-sections" },
        { label: "Education", href: "/admin/content/education" },
        { label: "Skills", href: "/admin/content/skills" },
        { label: "Projects", href: "/admin/content/projects" },
        { label: "Experience", href: "/admin/content/experience" },
        { label: "Certifications", href: "/admin/content/certifications" },
        { label: "Achievements", href: "/admin/content/achievements" },
        { label: "Journal", href: "/admin/content/journal" },
      ],
    },
    {
      label: "Library",
      items: [
        { label: "Resources", href: "/admin/content/resources" },
        { label: "Links", href: "/admin/content/links" },
        { label: "Categories", href: "/admin/content/categories" },
        { label: "Tags", href: "/admin/content/tags" },
        { label: "Media", href: "/admin/media" },
      ],
    },
    {
      label: "Site",
      items: [
        { label: "Messages", href: "/admin/messages", badge: newMessages },
        { label: "Settings & SEO", href: "/admin/settings" },
        { label: "Account", href: "/admin/account" },
      ],
    },
  ];
}

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ newMessages, onNavigate }: { newMessages: number; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-6">
      {groups(newMessages).map((group) => (
        <div key={group.label || "top"} className="flex flex-col gap-0.5">
          {group.label && <p className="eyebrow mb-1 px-3">{group.label}</p>}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center justify-between rounded-md px-3 text-small transition-colors",
                  active
                    ? "bg-surface-muted font-medium text-fg"
                    : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-accent px-1.5 text-micro font-semibold text-accent-fg">
                    {item.badge}
                    <span className="sr-only"> new</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  email,
  newMessages,
  children,
}: {
  email: string;
  newMessages: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-dvh flex-1">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-[var(--radius-button)] bg-accent px-4 py-2 text-small font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link href="/admin" className="text-body font-semibold">
            Dashboard
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <NavList newMessages={newMessages} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <RadixDialog.Root open={open} onOpenChange={setOpen}>
              <RadixDialog.Trigger asChild>
                <IconButton label="Open dashboard menu" variant="ghost" className="lg:hidden">
                  <Menu aria-hidden="true" className="size-5" />
                </IconButton>
              </RadixDialog.Trigger>
              <RadixDialog.Portal>
                <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay lg:hidden" />
                <RadixDialog.Content
                  aria-describedby={undefined}
                  className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface shadow-float lg:hidden"
                >
                  <div className="flex h-16 items-center justify-between px-4">
                    <RadixDialog.Title className="text-body font-semibold">
                      Dashboard
                    </RadixDialog.Title>
                    <RadixDialog.Close asChild>
                      <IconButton label="Close menu" variant="ghost">
                        <X aria-hidden="true" className="size-5" />
                      </IconButton>
                    </RadixDialog.Close>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-6">
                    <NavList newMessages={newMessages} onNavigate={() => setOpen(false)} />
                  </div>
                </RadixDialog.Content>
              </RadixDialog.Portal>
            </RadixDialog.Root>
            <Link href="/admin/content/journal/new" className={buttonClasses("primary", "sm")}>
              <PenLine aria-hidden="true" className="size-4" />
              <span>New journal entry</span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}
            >
              View site
              <ExternalIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <ThemeToggle />
            <span
              className="hidden max-w-48 truncate px-2 text-small text-fg-muted md:inline"
              title={email}
            >
              {email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              loading={signingOut}
              icon={<LogOut aria-hidden="true" className="size-4" />}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main id="admin-main" className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
