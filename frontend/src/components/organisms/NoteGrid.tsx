import { NoteCard } from "@/components/organisms/NoteCard";
import type { Note } from "@/features/notes/useNotes";

interface NoteGridProps {
  notes: Note[];
  /** FR-24: forwarded to each card so clicking one opens it in the editor. */
  onSelect?: (id: number) => void;
}

/**
 * FR-23: notes render in whichever order the API returns (`-lastEdited`
 * with a stable id tiebreak) — no client-side re-sorting.
 *
 * Every card is the same size: `grid-cols-3` equalizes the widths, and the
 * fixed 246px row height stops a long note from stretching its whole row.
 * Cards clip their own overflow, so uniformity does not depend on content.
 */
export function NoteGrid({ notes, onSelect }: NoteGridProps) {
  return (
    <div className="grid auto-rows-[246px] grid-cols-3 gap-x-[13px] gap-y-4">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onSelect={onSelect ? () => onSelect(note.id) : undefined}
        />
      ))}
    </div>
  );
}
