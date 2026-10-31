import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-fg-muted border-line",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

/** Short status label. Color is never the only signal: the text carries the meaning. */
export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-micro font-medium tracking-normal",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Topic label for tags and technologies. */
export function Tag({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-[var(--radius-input)] border border-line bg-surface px-2 font-mono text-micro text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  interactive = false,
  className,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface p-6",
        interactive &&
          "transition-[border-color,transform] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-line-strong",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div aria-hidden="true" className="mb-4 text-fg-muted [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h2 className="text-h3 font-semibold text-fg">{title}</h2>
      {description && <p className="mt-2 max-w-md text-small text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
    />
  );
}

const alertIcons: Record<Exclude<Tone, "neutral" | "accent">, typeof Info> & { info: typeof Info } =
  {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
  };

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = alertIcons[tone];
  const palette = {
    info: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  }[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-[var(--radius-button)] p-4", palette, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="text-small font-semibold">{title}</p>
        {children && <div className="text-small text-fg">{children}</div>}
      </div>
    </div>
  );
}
