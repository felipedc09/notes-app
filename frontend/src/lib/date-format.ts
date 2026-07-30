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
