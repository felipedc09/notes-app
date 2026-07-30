interface NoteCardMetaProps {
  date: string;
  categoryName: string;
}

/**
 * FR-20: date + category name row shown atop each note card. The two sit
 * together at the start of the row with an 8px gap — not pushed to opposite
 * edges — and the date is bold while the category name is regular weight.
 */
export function NoteCardMeta({ date, categoryName }: NoteCardMetaProps) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-bold">{date}</span>
      <span className="font-normal">{categoryName}</span>
    </div>
  );
}
