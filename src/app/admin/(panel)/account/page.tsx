import { AccountForms } from "@/components/admin/account-forms";
import { TwoFactorPanel } from "@/components/admin/two-factor-panel";
import { requireAdminPage } from "@/server/auth/guard";
import { listActiveSessions } from "@/server/auth/session";
import { recentSignInActivity, twoFactorStatus } from "@/server/services/auth";

export const metadata = { title: "Account" };

function describeAgent(agent: string | null): string {
  if (!agent) return "Unknown browser";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Chrome\//.test(agent)
      ? "Chrome"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(agent)
    ? "Windows"
    : /Android/.test(agent)
      ? "Android"
      : /iPhone|iPad/.test(agent)
        ? "iOS"
        : /Mac OS/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

const ACTIVITY_LABELS: Record<string, string> = {
  login: "Signed in",
  login_failed: "Failed sign-in attempt",
  logout: "Signed out",
  password_change: "Password changed",
  password_reset_cli: "Password reset from the server",
  totp_enabled: "Two-factor authentication turned on",
  totp_disabled: "Two-factor authentication turned off",
  sign_out_others: "Signed out other sessions",
};

export default async function AccountPage() {
  const admin = await requireAdminPage();
  const [sessions, twoFactor, activity] = await Promise.all([
    listActiveSessions(admin.id),
    twoFactorStatus(admin.id),
    recentSignInActivity(admin.id),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-h1 font-semibold">Account and security</h1>
        <p className="mt-2 text-fg-muted">Signed in as {admin.email}.</p>
      </header>
      <TwoFactorPanel
        enabledAt={twoFactor.enabledAt?.toISOString() ?? null}
        recoveryCodesLeft={twoFactor.recoveryCodesLeft}
      />
      <AccountForms
        sessions={sessions.map((session) => ({
          id: session.id.slice(0, 8),
          current: session.id === admin.sessionId,
          device: describeAgent(session.userAgent),
          lastSeen: session.lastSeenAt.toISOString().slice(0, 16).replace("T", " "),
        }))}
      />
      <section
        aria-labelledby="activity-heading"
        className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
      >
        <h2 id="activity-heading" className="text-h3 font-semibold">
          Recent sign-in activity
        </h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-small text-fg-muted">No activity recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {activity.map((entry) => {
              const method = (entry.summary as { method?: string } | null)?.method;
              return (
                <li
                  key={`${entry.action}-${entry.createdAt.toISOString()}`}
                  className="flex justify-between gap-4 py-2.5 text-small"
                >
                  <span className={entry.action === "login_failed" ? "text-danger" : undefined}>
                    {ACTIVITY_LABELS[entry.action] ?? entry.action}
                    {method ? ` (${method.replace("+", " + ")})` : ""}
                  </span>
                  <time dateTime={entry.createdAt.toISOString()} className="shrink-0 text-fg-muted">
                    {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
