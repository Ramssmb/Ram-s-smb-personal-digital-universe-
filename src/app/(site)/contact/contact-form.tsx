"use client";

import { CheckCircle2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";

type State =
  { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function ContactForm({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ kind: "sending" });
    setErrors({});
    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          subject: form.get("subject"),
          message: form.get("message"),
          website: form.get("website"),
          formToken: token,
        }),
      });
      if (response.ok) {
        setState({ kind: "sent" });
        return;
      }
      const body = await response.json().catch(() => null);
      setErrors(body?.error?.fields ?? {});
      setState({
        kind: "error",
        message:
          response.status === 429
            ? "Too many messages from your network. Please try again later."
            : (body?.error?.message ?? "The message could not be sent. Please try again."),
      });
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
    } catch {
      setState({
        kind: "error",
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  }

  if (state.kind === "sent") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-8"
      >
        <CheckCircle2 aria-hidden="true" className="size-8 text-success" />
        <h2 className="text-h3 font-semibold">Message sent</h2>
        <p className="text-fg-muted">Thank you for writing. I will reply by email.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5">
      {state.kind === "error" && <Alert tone="danger" title={state.message} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={errors.name} required>
          <Input name="name" autoComplete="name" maxLength={100} required />
        </Field>
        <Field label="Email" error={errors.email} required>
          <Input name="email" type="email" autoComplete="email" maxLength={254} required />
        </Field>
      </div>
      <Field label="Subject" error={errors.subject}>
        <Input name="subject" maxLength={150} />
      </Field>
      <Field label="Message" hint="At least 10 characters." error={errors.message} required>
        <Textarea name="message" rows={7} maxLength={5000} required />
      </Field>
      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Button type="submit" loading={state.kind === "sending"} className="self-start">
        Send message
      </Button>
      <p className="text-small text-fg-muted">Your details are used only to reply to you.</p>
    </form>
  );
}
