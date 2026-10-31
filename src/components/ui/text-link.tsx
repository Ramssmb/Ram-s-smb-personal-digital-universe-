import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/cn";
import { safeExternalUrl } from "@/lib/safe-url";

const linkClass =
  "font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent";

export function TextLink({
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: Route }) {
  return <Link className={cn(linkClass, className)} {...props} />;
}

export interface ExternalLinkProps extends Omit<ComponentProps<"a">, "href" | "target" | "rel"> {
  href: string;
  /** Opens in a new tab; announced to screen readers. */
  newTab?: boolean;
  showIcon?: boolean;
  /** Plain styling for use inside navigation or cards. */
  unstyled?: boolean;
  children: ReactNode;
}

/**
 * The only way to render a link to another site. Unsafe URLs (javascript:,
 * data:, credentials) render as plain text instead of a link.
 */
export function ExternalLink({
  href,
  newTab = false,
  showIcon = true,
  unstyled = false,
  className,
  children,
  ...props
}: ExternalLinkProps) {
  const safe = safeExternalUrl(href);
  if (!safe) return <span className={className}>{children}</span>;

  return (
    <a
      href={safe}
      rel="noopener noreferrer"
      target={newTab ? "_blank" : undefined}
      className={cn(!unstyled && linkClass, "inline-flex items-center gap-0.5", className)}
      {...props}
    >
      {children}
      {showIcon && <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />}
      {newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
