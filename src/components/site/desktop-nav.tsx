"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/cn";

import { isActivePath } from "./nav-utils";

const itemClass =
  "inline-flex h-9 items-center gap-1 rounded-[var(--radius-button)] px-3 text-small font-medium transition-colors";

export function DesktopNav({ items, more }: { items: NavItem[]; more: NavItem[] }) {
  const pathname = usePathname();
  const moreActive = more.some((item) => isActivePath(pathname, item.href));
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  itemClass,
                  active
                    ? "text-fg underline decoration-accent decoration-2 underline-offset-[6px]"
                    : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        {more.length > 0 && (
          <li>
            <Dropdown.Root modal={false}>
              <Dropdown.Trigger
                className={cn(
                  itemClass,
                  "data-[state=open]:bg-surface-muted",
                  moreActive
                    ? "text-fg underline decoration-accent decoration-2 underline-offset-[6px]"
                    : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                )}
              >
                More
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-48 rounded-[var(--radius-button)] border border-line bg-surface p-1 shadow-float animate-[fade-in_120ms_ease-out]"
                >
                  {more.map((item) => (
                    <Dropdown.Item key={item.href} asChild>
                      <Link
                        href={item.href}
                        aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                        className="flex h-9 items-center rounded-md px-3 text-small text-fg outline-none data-[highlighted]:bg-surface-muted aria-[current=page]:text-accent aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4"
                      >
                        {item.label}
                      </Link>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </li>
        )}
      </ul>
    </nav>
  );
}
