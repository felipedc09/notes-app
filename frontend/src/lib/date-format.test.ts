import { describe, expect, it } from "vitest";
import { formatCardDate, formatEditorTimestamp } from "./date-format";

describe("formatCardDate", () => {
  it("returns lowercase 'today' for a note edited earlier the same local day (FR-22, A1)", () => {
    const reference = new Date(2024, 6, 21, 9, 0, 0); // July 21, 2024, 9:00am local
    const noteDate = new Date(2024, 6, 21, 8, 30, 0).toISOString();
    expect(formatCardDate(noteDate, reference)).toBe("today");
  });

  it("returns lowercase 'yesterday' for a note edited late the previous local day, not a 24h delta (FR-22, A1)", () => {
    // Reference: today at 00:30am. Note: yesterday at 23:00 — under 90
    // minutes apart in wall-clock time, but a different local calendar day.
    const reference = new Date(2024, 6, 21, 0, 30, 0);
    const noteDate = new Date(2024, 6, 20, 23, 0, 0).toISOString();
    expect(formatCardDate(noteDate, reference)).toBe("yesterday");
  });

  it("returns 'today' for a note edited just after local midnight, even though nearly 24h remain in the day", () => {
    const reference = new Date(2024, 6, 21, 0, 5, 0); // 00:05am
    const noteDate = new Date(2024, 6, 21, 0, 1, 0).toISOString();
    expect(formatCardDate(noteDate, reference)).toBe("today");
  });

  it("returns 'Month D' with no year for any other date", () => {
    const reference = new Date(2024, 6, 21, 12, 0, 0);
    const noteDate = new Date(2024, 6, 10, 12, 0, 0).toISOString();
    expect(formatCardDate(noteDate, reference)).toBe("July 10");
  });

  it("never capitalizes today/yesterday", () => {
    const reference = new Date(2024, 6, 21, 12, 0, 0);
    expect(formatCardDate(new Date(2024, 6, 21, 6, 0, 0).toISOString(), reference)).not.toMatch(
      /[A-Z]/,
    );
    expect(formatCardDate(new Date(2024, 6, 20, 6, 0, 0).toISOString(), reference)).not.toMatch(
      /[A-Z]/,
    );
  });

  it("handles a note dated in the future gracefully, falling back to Month D", () => {
    const reference = new Date(2024, 6, 21, 12, 0, 0);
    const noteDate = new Date(2024, 6, 25, 12, 0, 0).toISOString();
    expect(formatCardDate(noteDate, reference)).toBe("July 25");
  });
});

describe("formatEditorTimestamp", () => {
  it("renders the exact 'Last Edited: Month D, YYYY at h:mm am/pm' string (FR-14)", () => {
    const date = new Date(2024, 6, 21, 20, 39, 0); // July 21, 2024, 8:39pm local
    expect(formatEditorTimestamp(date.toISOString())).toBe(
      "Last Edited: July 21, 2024 at 8:39pm",
    );
  });

  it("lowercases the am/pm marker with no space before it, for the am side too", () => {
    const date = new Date(2024, 0, 5, 9, 5, 0); // January 5, 2024, 9:05am local
    expect(formatEditorTimestamp(date.toISOString())).toBe(
      "Last Edited: January 5, 2024 at 9:05am",
    );
  });

  it("keeps the minute zero-padded but the hour unpadded, matching the design example", () => {
    const date = new Date(2024, 11, 1, 0, 4, 0); // December 1, 2024, 12:04am local
    expect(formatEditorTimestamp(date.toISOString())).toBe(
      "Last Edited: December 1, 2024 at 12:04am",
    );
  });
});
