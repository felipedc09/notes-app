import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Note } from "@/features/notes/useNotes";
import { NoteCard } from "./NoteCard";

const baseNote: Note = {
  id: 1,
  title: "A very long note title that should never be truncated no matter how many words it contains",
  content: "Short body",
  categoryId: 2,
  categoryName: "School",
  categoryColor: "#fcdc94",
  createdAt: new Date().toISOString(),
  lastEdited: new Date().toISOString(),
};

describe("NoteCard", () => {
  it("applies the category color via the --cat custom property (FR-16)", () => {
    const { container } = render(<NoteCard note={baseNote} />);
    const article = container.querySelector("article");
    expect(article).toHaveClass("note-surface");
    expect(article).toHaveStyle({ "--cat": "#fcdc94" });
  });

  it("renders the full title without a clamping class (FR-21)", () => {
    render(<NoteCard note={baseNote} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent(baseNote.title);
    expect(heading.className).not.toMatch(/line-clamp/);
  });

  it("clamps the content preview with line-clamp for the ellipsis truncation (FR-21)", () => {
    render(<NoteCard note={baseNote} />);
    const preview = screen.getByText("Short body").closest("div.line-clamp-4");
    expect(preview).not.toBeNull();
  });

  it("shows the date and category name (FR-20)", () => {
    render(<NoteCard note={{ ...baseNote, lastEdited: new Date().toISOString() }} />);
    expect(screen.getByText("today")).toBeInTheDocument();
    expect(screen.getByText("School")).toBeInTheDocument();
  });
});
