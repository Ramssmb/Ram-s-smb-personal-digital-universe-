"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { IconButton } from "@/components/ui/button";
import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/cn";

import { isActivePath } from "./nav-utils";

/** Full-screen navigation sheet for small screens. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Trigger asChild>
        <IconButton label="Open menu" variant="ghost" className="lg:hidden">
          <Menu aria-hidden="true" className="size-5" />
        </IconButton>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-canvas animate-[fade-in_150ms_ease-out] lg:hidden"
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-6">
            <RadixDialog.Title className="eyebrow">Menu</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton label="Close menu" variant="ghost">
                <X aria-hidden="true" className="size-5" />
              </IconButton>
            </RadixDialog.Close>
          </div>
          <nav aria-label="Primary" className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <ul className="flex flex-col">
              {items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-14 items-center border-b border-line text-h3 font-medium",
                        active ? "text-accent" : "text-fg",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
