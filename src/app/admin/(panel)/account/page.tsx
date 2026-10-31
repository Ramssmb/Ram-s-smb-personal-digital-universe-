import { AccountForms } from "@/components/admin/account-forms";
import { requireAdminPage } from "@/server/auth/guard";
import { listActiveSessions } from "@/server/auth/session";

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

export default async function AccountPage() {
  const admin = await requireAdminPage();
  const sessions = await listActiveSessions(admin.id);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-h1 font-semibold">Account and security</h1>
        <p className="mt-2 text-fg-muted">Signed in as {admin.email}.</p>
      </header>
      <AccountForms
        sessions={sessions.map((session) => ({
          id: session.id.slice(0, 8),
          current: session.id === admin.sessionId,
          device: describeAgent(session.userAgent),
          lastSeen: session.lastSeenAt.toISOString().slice(0, 16).replace("T", " "),
        }))}
      />
    </div>
  );
}
