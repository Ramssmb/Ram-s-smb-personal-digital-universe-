"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { api, ApiError } from "./api";

interface SessionInfo {
  id: string;
  current: boolean;
  device: string;
  lastSeen: string;
}

export function AccountForms({ sessions }: { sessions: SessionInfo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setErrors({ confirmPassword: "The new passwords do not match." });
      return;
    }
    setBusy("password");
    setErrors({});
    setMessage(null);
    try {
      await api("/api/v1/admin/account/password", {
        json: {
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        },
      });
      formElement.reset();
      setMessage({
        tone: "success",
        text: "Password changed. All other sessions were signed out.",
      });
      router.refresh();
    } catch (thrown) {
      if (thrown instanceof ApiError) {
        setErrors(thrown.fields);
        setMessage({ tone: "danger", text: thrown.message });
      }
    } finally {
      setBusy(null);
    }
  }

  async function signOutOthers() {
    setBusy("sessions");
    setMessage(null);
    try {
      const { revoked } = await api<{ revoked: number }>("/api/v1/admin/account/sessions", {
        method: "DELETE",
      });
      setMessage({
        tone: "success",
        text: `Signed out ${revoked} other session${revoked === 1 ? "" : "s"}.`,
      });
      router.refresh();
    } catch (thrown) {
      setMessage({
        tone: "danger",
        text: thrown instanceof ApiError ? thrown.message : "Could not sign out.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {message && <Alert tone={message.tone} title={message.text} />}
      <section
        aria-labelledby="password-heading"
        className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
      >
        <h2 id="password-heading" className="text-h3 font-semibold">
          Change password
        </h2>
        <form onSubmit={changePassword} noValidate className="mt-4 flex flex-col gap-4">
          <Field label="Current password" error={errors.currentPassword} required>
            <Input name="currentPassword" type="password" autoComplete="current-password" />
          </Field>
          <Field
            label="New password"
            hint="At least 12 characters."
            error={errors.newPassword}
            required
          >
            <Input name="newPassword" type="password" autoComplete="new-password" />
          </Field>
          <Field label="Repeat new password" error={errors.confirmPassword} required>
            <Input name="confirmPassword" type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" className="self-start" loading={busy === "password"}>
            Change password
          </Button>
        </form>
      </section>

      <section
        aria-labelledby="sessions-heading"
        className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
      >
        <h2 id="sessions-heading" className="text-h3 font-semibold">
          Active sessions
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-4 py-3 text-small"
            >
              <span>
                {session.device}
                <span className="block text-fg-muted">Last active {session.lastSeen} UTC</span>
              </span>
              {session.current && <Badge tone="success">This browser</Badge>}
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          className="mt-4"
          loading={busy === "sessions"}
          onClick={signOutOthers}
          disabled={sessions.length < 2}
        >
          Sign out all other sessions
        </Button>
      </section>
    </div>
  );
}
