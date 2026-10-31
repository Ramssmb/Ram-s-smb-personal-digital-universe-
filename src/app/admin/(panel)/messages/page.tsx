import Link from "next/link";
import type { Route } from "next";

import { MessageActions } from "@/components/admin/message-actions";
import { EmptyState, Badge } from "@/components/ui/display";
import { label } from "@/lib/content/enums";
import { cn } from "@/lib/cn";
import { requireAdminPage } from "@/server/auth/guard";
import { listMessages } from "@/server/services/contact";

export const metadata = { title: "Messages" };

const FILTERS = [
  { value: "", label: "Inbox" },
  { value: "new", label: "New" },
  { value: "archived", label: "Archived" },
  { value: "spam", label: "Spam" },
];

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdminPage();
  const { status = "", page } = await searchParams;
  const result = await listMessages({ status, page: Math.max(1, Number(page) || 1) });
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-h1 font-semibold">Messages</h1>
        <p className="mt-2 text-fg-muted">
          Submissions from the contact form. Shown as plain text only.
        </p>
      </header>
      <nav aria-label="Message filters" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              (filter.value ? `/admin/messages?status=${filter.value}` : "/admin/messages") as Route
            }
            aria-current={status === filter.value ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3 text-small",
              status === filter.value
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-fg-muted hover:text-fg",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {result.items.length === 0 ? (
        <EmptyState
          title="No messages here"
          description="Messages sent through the contact form appear here."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {result.items.map((message) => (
            <li
              key={message.id}
              className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{message.subject || "(no subject)"}</p>
                  <p className="truncate text-small text-fg-muted">
                    {message.name} ·{" "}
                    <a
                      href={`mailto:${message.email}`}
                      className="text-accent underline underline-offset-2"
                    >
                      {message.email}
                    </a>{" "}
                    ·{" "}
                    <time dateTime={message.createdAt.toISOString()}>
                      {message.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                    </time>
                  </p>
                </div>
                <Badge
                  tone={
                    message.status === "new"
                      ? "accent"
                      : message.status === "spam"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {label(message.status)}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap break-words text-body">{message.body}</p>
              <MessageActions id={message.id} status={message.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
