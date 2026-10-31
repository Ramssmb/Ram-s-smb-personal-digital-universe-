"use client";

import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

import { useField } from "./field";

const control =
  "w-full rounded-[var(--radius-input)] border border-line-strong bg-surface text-body text-fg " +
  "placeholder:text-fg-muted transition-[border-color,box-shadow] duration-150 " +
  "hover:border-fg-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/40";

/** Wires id, aria-describedby, aria-invalid and required from the enclosing Field. */
function useControlProps({ id, required }: { id?: string; required?: boolean }) {
  const field = useField();
  return {
    id: id ?? field?.id,
    required: required ?? field?.required,
    "aria-describedby": field?.describedBy,
    "aria-invalid": field?.invalid || undefined,
  };
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  const a11y = useControlProps(props);
  return <input className={cn(control, "h-11 px-3", className)} {...props} {...a11y} />;
}

export function Textarea({ className, rows = 5, ...props }: ComponentProps<"textarea">) {
  const a11y = useControlProps(props);
  return (
    <textarea
      rows={rows}
      className={cn(control, "min-h-24 px-3 py-2.5 leading-relaxed", className)}
      {...props}
      {...a11y}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  const a11y = useControlProps(props);
  return (
    <div className="relative">
      <select
        className={cn(control, "h-11 appearance-none pr-10 pl-3", className)}
        {...props}
        {...a11y}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  );
}
