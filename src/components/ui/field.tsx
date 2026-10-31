"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Lets inputs pick up their id, description and error state from the enclosing Field. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Visually hide the label (it is still read by screen readers). */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required = false,
  hideLabel = false,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label
          htmlFor={id}
          className={cn("text-small font-medium text-fg", hideLabel && "sr-only")}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-small text-fg-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-small font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
