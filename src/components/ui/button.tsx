import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-button)] font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-standard)] " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-muted",
  ghost: "text-fg hover:bg-surface-muted",
  danger: "bg-danger text-danger-fg hover:bg-danger-hover",
};

// Minimum 40px / 44px heights keep tap targets usable on touch screens.
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-small",
  md: "h-11 px-4 text-small",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and announces the busy state. */
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  icon,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "children" | "icon"> {
  /** Required: icon-only buttons have no visible text. */
  label: string;
  children: ReactNode;
}

export function IconButton({ label, size = "md", className, children, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      size={size}
      className={cn(size === "sm" ? "w-9 px-0" : "w-11 px-0", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: Route;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** An internal navigation link styled as a button. */
export function ButtonLink({ href, variant, size, className, ...props }: ButtonLinkProps) {
  return <Link href={href} className={buttonClasses(variant, size, className)} {...props} />;
}
