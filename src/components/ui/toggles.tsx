"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label: ReactNode;
  description?: string;
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const descriptionId = description ? `${inputId}-description` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={inputId}
        type="checkbox"
        aria-describedby={descriptionId}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line-strong accent-[var(--accent)]"
        {...props}
      />
      <div className="flex flex-col">
        <label htmlFor={inputId} className="cursor-pointer text-small font-medium text-fg">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-small text-fg-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export interface SwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

/** An on/off setting that applies immediately (use Checkbox inside forms that are submitted). */
export function Switch({ label, checked, onCheckedChange, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <span id={`${id}-label`} className="text-small font-medium text-fg">
          {label}
        </span>
        {description && (
          <span id={`${id}-description`} className="text-small text-fg-muted">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-5 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
