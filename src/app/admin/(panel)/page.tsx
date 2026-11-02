import Link from "next/link";
import type { Route } from "next";

import { Badge, Card } from "@/components/ui/display";
import { requireAdminPage } from "@/server/auth/guard";
import { contentCounts, lastPublishedJournalDate, recentDrafts } from "@/server/content/admin-data";
import { getProfile } from "@/server/content/singletons";
import { countNewMessages } from "@/server/services/contact";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  await requireAdminPage();
  const [counts, drafts, lastJournal, newMessages, profile] = await Promise.all([
    contentCounts(),
    recentDrafts(),
    lastPublishedJournalDate(),
    countNewMessages(),
    getProfile(),
  ]);
  const published = counts.reduce((sum, c) => sum + c.published, 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <h1 className="text-h1 font-semibold">Overview</h1>
        <p className="mt-2 text-fg-muted">
          {published === 0
            ? "Nothing is published yet. Start with your profile, then publish your first journal entry."
            : `${published} published item${published === 1 ? "" : "s"} across the site.`}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="eyebrow">Profile</p>
          <p className="mt-2 text-h3 font-semibold">
            {profile.displayName ? "Complete" : "Not set up"}
          </p>
          <Link
            href="/admin/profile"
            className="mt-3 inline-block text-small font-medium text-accent"
          >
            {profile.displayName ? "Edit profile" : "Add your name and introduction"}
          </Link>
        </Card>
        <Card>
          <p className="eyebrow">Journal</p>
          <p className="mt-2 text-h3 font-semibold">
            {lastJournal ? `Last entry ${lastJournal}` : "No entries yet"}
          </p>
          <Link
            href="/admin/content/journal/new"
            className="mt-3 inline-block text-small font-medium text-accent"
          >
            Write today’s entry
          </Link>
        </Card>
        <Card>
          <p className="eyebrow">Messages</p>
          <p className="mt-2 text-h3 font-semibold">{newMessages} new</p>
          <Link
            href="/admin/messages"
            className="mt-3 inline-block text-small font-medium text-accent"
          >
            Open inbox
          </Link>
        </Card>
      </div>

      <section aria-labelledby="content-heading">
        <h2 id="content-heading" className="text-h3 font-semibold">
          Content
        </h2>
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table aria-labelledby="content-heading" className="w-full text-left text-small">
            <thead className="bg-surface-muted text-fg-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Section
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Published
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Drafts
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Archived
                </th>
              </tr>
            </thead>
            <tbody>
              {counts.map((row) => (
                <tr key={row.key} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link href={`/admin/content/${row.key}` as Route} className="hover:text-accent">
                      {row.label}
                    </Link>
                  </th>
                  <td className="px-4 py-3">{row.published}</td>
                  <td className="px-4 py-3">{row.draft}</td>
                  <td className="px-4 py-3">{row.archived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {drafts.length > 0 && (
        <section aria-labelledby="drafts-heading">
          <h2 id="drafts-heading" className="text-h3 font-semibold">
            Recent drafts
          </h2>
          <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link
                  href={`/admin/content/${draft.collection}/${draft.id}` as Route}
                  className="truncate font-medium hover:text-accent"
                >
                  {draft.title}
                </Link>
                <Badge>{draft.collection === "journal" ? "Journal" : "Project"}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
