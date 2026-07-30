import { NoteCard } from "@/components/organisms/NoteCard";
import type { Note } from "@/features/notes/useNotes";

interface NoteGridProps {
  notes: Note[];
}

/** FR-23: notes render in whichever order the API returns (`-lastEdited`
 * with a stable id tiebreak) — no client-side re-sorting. */
export function NoteGrid({ notes }: NoteGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
