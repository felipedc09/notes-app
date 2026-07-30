interface NoteCardMetaProps {
  date: string;
  categoryName: string;
}

/** FR-20: date + category name row shown atop each note card. */
export function NoteCardMeta({ date, categoryName }: NoteCardMetaProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--color-heading)]">
      <span>{date}</span>
      <span>{categoryName}</span>
    </div>
  );
}
