// Dates are stored as calendar dates (YYYY-MM-DD) and formatted in UTC so the
// server and every visitor see the same day.

const monthYear = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const longMonth = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

export function formatDate(
  value: string | Date | null | undefined,
  style: "full" | "month" = "full",
): string {
  if (!value) return "";
  return (style === "month" ? monthYear : fullDate).format(toDate(value));
}

/** "Jan 2026 – Present", "Jan 2026 – Mar 2026", or "" when unknown. */
export function formatRange(
  start: string | null | undefined,
  end: string | null | undefined,
  ongoingLabel = "Present",
): string {
  if (!start && !end) return "";
  const from = start ? formatDate(start, "month") : "";
  const to = end ? formatDate(end, "month") : ongoingLabel;
  return from ? `${from} – ${to}` : to;
}

/** "2026-11" → "November 2026". */
export function formatMonthKey(key: string): string {
  return longMonth.format(new Date(`${key}-01T00:00:00Z`));
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A plain-text excerpt of Markdown for meta descriptions: drops code, images,
 * link targets and formatting characters, then cuts at a word boundary.
 */
export function plainExcerpt(markdown: string | null | undefined, max = 155): string {
  if (!markdown) return "";
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // List markers only at the start of a line, so "fan-out" keeps its hyphen.
    .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, " ")
    .replace(/[`*_>#~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

/** A journal entry's summary, or else an excerpt of its first section with content. */
export function journalExcerpt(entry: {
  summary: string;
  learnedMd: string;
  bodyMd: string;
  builtMd: string;
  problemsMd: string;
}): string | undefined {
  const source = [
    entry.summary,
    entry.learnedMd,
    entry.bodyMd,
    entry.builtMd,
    entry.problemsMd,
  ].find((s) => s.trim());
  return source ? plainExcerpt(source) : undefined;
}
