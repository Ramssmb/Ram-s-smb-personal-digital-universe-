"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { api, ApiError } from "./api";

type Stage =
  | { kind: "idle" }
  | { kind: "setup"; secret: string; uri: string }
  | { kind: "codes"; codes: string[] };

/** Turn two-factor authentication on (with recovery codes) or off. */
export function TwoFactorPanel({
  enabledAt,
  recoveryCodesLeft,
}: {
  enabledAt: string | null;
  recoveryCodesLeft: number;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function fail(thrown: unknown) {
    if (thrown instanceof ApiError) {
      setErrors(thrown.fields);
      if (!Object.keys(thrown.fields).length) setMessage(thrown.message);
    } else {
      setMessage("Something went wrong. Try again.");
    }
  }

  async function start() {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const result = await api<{ secret: string; uri: string }>("/api/v1/admin/account/totp", {
        method: "POST",
      });
      setStage({ kind: "setup", ...result });
    } catch (thrown) {
      fail(thrown);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const { recoveryCodes } = await api<{ recoveryCodes: string[] }>(
        "/api/v1/admin/account/totp/confirm",
        { json: { code } },
      );
      setStage({ kind: "codes", codes: recoveryCodes });
      router.refresh();
    } catch (thrown) {
      fail(thrown);
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await api("/api/v1/admin/account/totp", {
        method: "DELETE",
        json: { password: form.get("password"), code: form.get("code") },
      });
      setStage({ kind: "idle" });
      router.refresh();
    } catch (thrown) {
      fail(thrown);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="two-factor-heading"
      className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="two-factor-heading" className="text-h3 font-semibold">
          Two-factor authentication
        </h2>
        <Badge tone={enabledAt ? "success" : "warning"}>{enabledAt ? "On" : "Off"}</Badge>
      </div>
      {message && <Alert tone="danger" title={message} className="mt-4" />}

      {stage.kind === "codes" && (
        <div className="mt-4 flex flex-col gap-3">
          <Alert tone="success" title="Two-factor authentication is on.">
            Save these recovery codes somewhere safe. Each works once if you lose your phone. They
            will not be shown again.
          </Alert>
          <ul
            aria-label="Recovery codes"
            className="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-4 font-mono text-small"
          >
            {stage.codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setStage({ kind: "idle" })}
          >
            I have saved them
          </Button>
        </div>
      )}

      {stage.kind === "setup" && (
        <form onSubmit={confirm} noValidate className="mt-4 flex flex-col gap-4">
          <ol className="prose list-decimal text-small">
            <li>
              In your authenticator app (for example Aegis, Google Authenticator or 1Password), add
              an account with this setup key:
              <code className="mt-2 block break-all" aria-label="Setup key">
                {stage.secret}
              </code>
              On a phone you can open{" "}
              <a href={stage.uri} className="underline">
                this setup link
              </a>{" "}
              instead.
            </li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <Field label="Code from the app" error={errors.code} required>
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>
              Turn on
            </Button>
            <Button variant="ghost" onClick={() => setStage({ kind: "idle" })} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {stage.kind === "idle" && !enabledAt && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-small text-fg-muted">
            Require a code from your phone in addition to the password. Strongly recommended for a
            public site.
          </p>
          <Button className="self-start" onClick={start} loading={busy}>
            Set up two-factor authentication
          </Button>
        </div>
      )}

      {stage.kind === "idle" && enabledAt && (
        <form onSubmit={disable} noValidate className="mt-4 flex flex-col gap-4">
          <p className="text-small text-fg-muted">
            On since {enabledAt.slice(0, 10)} · {recoveryCodesLeft} recovery code
            {recoveryCodesLeft === 1 ? "" : "s"} left.
          </p>
          <details>
            <summary className="cursor-pointer text-small font-medium">
              Turn two-factor authentication off
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <Field label="Password" error={errors.password} required>
                <Input name="password" type="password" autoComplete="current-password" />
              </Field>
              <Field label="Code from the app or a recovery code" error={errors.code} required>
                <Input name="code" autoComplete="one-time-code" maxLength={20} />
              </Field>
              <Button type="submit" variant="danger" className="self-start" loading={busy}>
                Turn off
              </Button>
            </div>
          </details>
        </form>
      )}
    </section>
  );
}
