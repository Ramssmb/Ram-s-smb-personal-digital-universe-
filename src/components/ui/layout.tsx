import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Centered content column with responsive gutters (16 / 24 / 32 px). */
export function Container({
  width = "default",
  className,
  ...props
}: ComponentProps<"div"> & { width?: "default" | "prose" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        width === "prose" ? "max-w-3xl" : "max-w-[1200px]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b border-line pt-12 pb-10 md:flex-row md:items-end md:justify-between md:pt-20 md:pb-12">
      <div className="flex max-w-2xl flex-col gap-3">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-h1 font-semibold text-fg">{title}</h1>
        {description && <div className="text-body-lg text-fg-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("py-12 md:py-16 lg:py-24", className)}>
      {title && (
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-h2 font-semibold text-fg">{title}</h2>
          {description && <p className="max-w-2xl text-body text-fg-muted">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
