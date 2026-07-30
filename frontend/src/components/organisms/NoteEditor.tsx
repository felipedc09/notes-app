"use client";

import { useState, type CSSProperties } from "react";
import { IconButton } from "@/components/atoms/IconButton";
import { CategorySelect } from "@/components/molecules/CategorySelect";
import type { Category } from "@/features/categories/useCategories";
import { useNoteDraft } from "@/features/notes/useNoteDraft";
import type { Note } from "@/features/notes/useNotes";
import { formatEditorTimestamp } from "@/lib/date-format";
import { Markdown } from "@/lib/markdown";

interface NoteEditorProps {
  /** The note being opened, or `null` for a brand-new draft (FR-09). */
  note: Note | null;
  categories: Category[];
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 2l12 12M14 2L2 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Overlay on `/`, not a route (design.md §5). Renders as an in-memory draft
 * for a new note (FR-09) or an existing persisted note (FR-24). Reuses the
 * `.note-surface` styling (FR-16) and `lib/markdown.tsx` (FR-26) for the
 * read state; clicking the title/content swaps to a raw-Markdown editable
 * field (FR-24, FR-25). The single top-right control (FR-17) closes the
 * overlay through `useNoteDraft`'s close handling (FR-27).
 */
export function NoteEditor({ note, categories, onClose }: NoteEditorProps) {
  const draft = useNoteDraft({
    note,
    defaultCategoryId: note?.categoryId ?? categories[0]?.id ?? 0,
    onClose,
  });

  // FR-12: a brand-new draft opens directly into editable fields showing
  // native placeholders. An existing note (FR-24) opens read-only; clicking
  // the text swaps that field into edit mode.
  const [editingTitle, setEditingTitle] = useState(note === null);
  const [editingContent, setEditingContent] = useState(note === null);

  const selectedCategory = categories.find((category) => category.id === draft.categoryId);

  function handleClose() {
    void draft.close();
  }

  return (
    <div className="fixed inset-0 z-10 flex flex-col overflow-y-auto bg-[var(--color-bg)] px-[37px] pt-8 pb-8">
      <div className="flex items-center justify-between gap-4">
        <CategorySelect
          categories={categories}
          value={draft.categoryId}
          onChange={draft.updateCategory}
        />
        <IconButton
          icon={<CloseIcon />}
          label="Close note"
          onClick={handleClose}
          className="!h-6 !w-6 !rounded-none hover:!bg-transparent"
        />
      </div>

      <div
        className="note-surface mt-3 flex flex-1 flex-col gap-3 p-8"
        style={{ "--cat": selectedCategory?.color ?? "#ffffff" } as CSSProperties}
      >
        {draft.lastEdited && (
          <p className="text-right text-xs font-bold">
            {formatEditorTimestamp(draft.lastEdited)}
          </p>
        )}

        {editingTitle ? (
          <input
            autoFocus
            value={draft.title}
            placeholder="Note Title"
            onChange={(event) => draft.updateTitle(event.target.value)}
            onBlur={() => setEditingTitle(false)}
            className="w-full bg-transparent font-[family-name:var(--font-heading)] text-2xl font-bold outline-none placeholder:text-[var(--color-text)]/50"
          />
        ) : (
          <h2
            onClick={() => setEditingTitle(true)}
            className="cursor-text font-[family-name:var(--font-heading)] text-2xl font-bold break-words whitespace-pre-wrap"
          >
            {draft.title || <span className="text-[var(--color-text)]/50">Note Title</span>}
          </h2>
        )}

        {editingContent ? (
          <textarea
            value={draft.content}
            placeholder="Pour your heart out..."
            onChange={(event) => draft.updateContent(event.target.value)}
            onBlur={() => setEditingContent(false)}
            className="min-h-[300px] flex-1 resize-none bg-transparent outline-none placeholder:text-[var(--color-text)]/50"
          />
        ) : (
          <div
            onClick={() => setEditingContent(true)}
            className="min-h-[300px] flex-1 cursor-text"
          >
            {draft.content ? (
              <Markdown content={draft.content} />
            ) : (
              <span className="text-[var(--color-text)]/50">Pour your heart out...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
