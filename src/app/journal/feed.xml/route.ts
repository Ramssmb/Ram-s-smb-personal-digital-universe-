import { journalExcerpt } from "@/lib/format";
import { getIdentity, recentJournalForFeed } from "@/server/content/public";
import { absoluteUrl, FEED_PATH } from "@/server/seo";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch]!,
  );
}

/** RSS 2.0 feed of published journal entries. */
export async function GET() {
  const [{ siteName, settings }, entries] = await Promise.all([
    getIdentity(),
    recentJournalForFeed(),
  ]);
  const title = `${siteName ?? "Personal site"} — Journal`;
  const description = settings.defaultDescription || title;
  const lastBuild = entries.reduce<Date | null>(
    (latest, e) => (!latest || e.updatedAt > latest ? e.updatedAt : latest),
    null,
  );
  const items = entries
    .map((entry) => {
      const url = absoluteUrl(`/journal/${entry.slug}`);
      const excerpt = journalExcerpt(entry);
      return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${entry.entryDate}T12:00:00Z`).toUTCString()}</pubDate>${
        excerpt ? `\n      <description>${escapeXml(excerpt)}</description>` : ""
      }
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${absoluteUrl("/journal")}</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>${lastBuild ? `\n    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>` : ""}
    <atom:link href="${absoluteUrl(FEED_PATH)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
