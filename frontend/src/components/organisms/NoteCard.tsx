import type { CSSProperties } from "react";
import { NoteCardMeta } from "@/components/molecules/NoteCardMeta";
import type { Note } from "@/features/notes/useNotes";
import { formatCardDate } from "@/lib/date-format";
import { Markdown } from "@/lib/markdown";

interface NoteCardProps {
  note: Note;
}

/**
 * Read-only dashboard preview card (FR-16, FR-20, FR-21). The `.note-surface`
 * class (globals.css) draws the 3px category-color border + 50% color-mix
 * fill from the `--cat` custom property. The title wraps in full and is
 * never clamped; only the content preview truncates with an ellipsis via
 * `-webkit-line-clamp`.
 */
export function NoteCard({ note }: NoteCardProps) {
  return (
    <article
      className="note-surface flex flex-col gap-2 p-4"
      style={{ "--cat": note.categoryColor } as CSSProperties}
    >
      <NoteCardMeta
        date={formatCardDate(note.lastEdited)}
        categoryName={note.categoryName}
      />
      <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold break-words whitespace-pre-wrap text-[var(--color-heading)]">
        {note.title}
      </h3>
      <div className="line-clamp-4 overflow-hidden text-sm text-[var(--color-heading)]">
        <Markdown content={note.content} preview />
      </div>
    </article>
  );
}
