/**
 * Client-side date formatting (design.md §7). All formatting depends on the
 * *viewer's* local timezone, so this never runs server-side — a
 * server-formatted string would be wrong for a user outside the server's
 * zone and would go stale in a tab left open past midnight.
 */

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toLocalCalendarDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * FR-22 / Decision A1: `today` | `yesterday` (lowercase) | `Month D` (no
 * year). Compared by **local calendar day**, not by a 24-hour delta — a
 * note edited at 11pm yesterday is still "yesterday" even though under 24
 * hours have elapsed, and a note edited at 12:01am today is already "today"
 * even though almost 24 hours remain.
 */
export function formatCardDate(
  isoDate: string,
  reference: Date = new Date(),
): string {
  const date = new Date(isoDate);
  const dateDayMs = toLocalCalendarDayMs(date);
  const referenceDayMs = toLocalCalendarDayMs(reference);
  const diffDays = Math.round((referenceDayMs - dateDayMs) / MS_PER_DAY);

  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  return MONTH_DAY_FORMATTER.format(date);
}

const EDITOR_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * FR-14 / Decision A2: `Last Edited: Month D, YYYY at h:mm am/pm`, e.g.
 * "Last Edited: July 21, 2024 at 8:39pm". Assembled from
 * `Intl.DateTimeFormat` parts rather than the formatted string directly,
 * because `Intl` yields `8:39 PM` (uppercase, space before the marker) and
 * the spec wants `8:39pm` (lowercase, no space) — intentionally different
 * from the card format (`formatCardDate`), which is deliberately terser.
 */
export function formatEditorTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const parts = EDITOR_TIMESTAMP_FORMATTER.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";

  const month = part("month");
  const day = part("day");
  const year = part("year");
  const hour = part("hour");
  const minute = part("minute");
  const dayPeriod = part("dayPeriod").toLowerCase();

  return `Last Edited: ${month} ${day}, ${year} at ${hour}:${minute}${dayPeriod}`;
}
