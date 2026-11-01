"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/components/admin/api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type LoginResult = { mfaRequired: true; ticket: string } | { user: { id: string } };

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set after a correct password when the account has two-factor authentication.
  const [ticket, setTicket] = useState<string | null>(null);

  function done() {
    router.replace(next as Route);
    router.refresh();
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await api<LoginResult>("/api/v1/auth/login", {
        json: { email: form.get("email"), password: form.get("password") },
      });
      if ("mfaRequired" in result) {
        setTicket(result.ticket);
        setBusy(false);
        return;
      }
      done();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/auth/totp", { json: { ticket, code: form.get("code") } });
      done();
    } catch (thrown) {
      if (thrown instanceof ApiError && /expired/i.test(thrown.message)) setTicket(null);
      setError(thrown instanceof ApiError ? thrown.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <form onSubmit={submitCode} className="mt-8 flex flex-col gap-5" noValidate>
        {error && <Alert tone="danger" title={error} />}
        <Field
          label="Authentication code"
          hint="The 6-digit code from your authenticator app, or one of your recovery codes."
          required
        >
          <Input
            name="code"
            autoComplete="one-time-code"
            inputMode="text"
            maxLength={20}
            required
            autoFocus
          />
        </Field>
        <Button type="submit" loading={busy} className="mt-2 w-full">
          Verify
        </Button>
        <Button variant="ghost" onClick={() => setTicket(null)} disabled={busy}>
          Use a different account
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="mt-8 flex flex-col gap-5" noValidate>
      {error && <Alert tone="danger" title={error} />}
      <Field label="Email" required>
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" loading={busy} className="mt-2 w-full">
        Sign in
      </Button>
    </form>
  );
}
