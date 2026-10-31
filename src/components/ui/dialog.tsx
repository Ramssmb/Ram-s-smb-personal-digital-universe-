"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Button, IconButton } from "./button";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Modal dialog. Radix handles focus trapping, Escape, scroll lock and aria wiring. */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-[var(--radius-card)] border border-line bg-surface shadow-float",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 p-6 pb-0">
            <div className="flex flex-col gap-1.5">
              <RadixDialog.Title className="text-h3 font-semibold text-fg">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-small text-fg-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close" variant="ghost" size="sm" className="-mt-1 -mr-2">
                <X aria-hidden="true" className="size-4" />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {children && <div className="overflow-y-auto px-6 pt-4">{children}</div>}
          <div className="flex flex-col-reverse gap-2 p-6 sm:flex-row sm:justify-end">{footer}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  /** Use "danger" for permanent or destructive actions. */
  tone?: "primary" | "danger";
  onConfirm: () => Promise<void> | void;
}

/**
 * Asks before a destructive action. Stays open and shows the error if the
 * action fails, so a failed delete is never silently reported as done.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The action failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) setError(null);
      }}
      trigger={trigger}
      title={title}
      description={description}
      footer={
        <>
          <RadixDialog.Close asChild>
            <Button variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </RadixDialog.Close>
          <Button variant={tone} loading={busy} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-small font-medium text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
