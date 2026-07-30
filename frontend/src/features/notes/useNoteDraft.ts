"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CATEGORIES_QUERY_KEY } from "@/features/categories/useCategories";
import { apiFetch } from "@/lib/api-client";
import { NOTES_QUERY_KEY, type Note } from "./useNotes";

const SAVE_DEBOUNCE_MS = 500;

interface DraftFields {
  title: string;
  content: string;
}

interface UseNoteDraftOptions {
  /** The note being opened, or `null` for a brand-new in-memory draft. */
  note: Note | null;
  /** Category assigned to a brand-new draft before the user picks one. */
  defaultCategoryId: number;
  onClose: () => void;
}

export interface NoteDraft {
  title: string;
  content: string;
  categoryId: number;
  lastEdited: string | null;
  updateTitle: (value: string) => void;
  updateContent: (value: string) => void;
  updateCategory: (categoryId: number) => void;
  close: () => Promise<void>;
}

/**
 * Draft lifecycle state machine (design.md §3, FR-09/FR-10, risk R5).
 *
 * "New Note" creates the row immediately: opening the editor fires one
 * `POST /api/notes` with empty fields, so the note has a real id and a
 * server `lastEdited` to display from the moment it opens. Every keystroke
 * after that schedules a debounced `PATCH /api/notes/{id}`.
 *
 * All network writes for this draft are funneled through `enqueue`, a
 * single promise chain, so the opening POST always resolves — and `idRef`
 * is set — before any later write fires. That single in-flight lock is what
 * stops fast typing from racing ahead of the create.
 *
 * Empty notes persist: closing a note with both fields blank keeps it,
 * rather than discarding it as the original FR-27 required.
 */
export function useNoteDraft({ note, defaultCategoryId, onClose }: UseNoteDraftOptions): NoteDraft {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [categoryId, setCategoryId] = useState(note?.categoryId ?? defaultCategoryId);
  const [lastEdited, setLastEdited] = useState<string | null>(note?.lastEdited ?? null);

  // Refs mirror state that async callbacks need to read without capturing
  // a stale render's closure. Each ref has exactly one writer, so no
  // separate sync effect is needed.
  const idRef = useRef<number | null>(note?.id ?? null);
  const categoryIdRef = useRef(categoryId);
  const persistedRef = useRef(note !== null);
  // An existing note is already created; a new draft creates itself on open.
  const createStartedRef = useRef(note !== null);
  const pendingRef = useRef<DraftFields | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  const invalidate = useCallback(() => {
    // Counts are server-derived (NFR-05): every note write can change a
    // category's noteCount, so both caches must invalidate together.
    queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  }, [queryClient]);

  // Runs `task` only after every previously queued write for this draft
  // has settled — the single in-flight-save lock (R5).
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const result = chainRef.current.then(task, task);
    chainRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  const performSave = useCallback(
    async (fields: DraftFields) => {
      if (idRef.current === null) {
        const created = await apiFetch<Note>("/notes", {
          method: "POST",
          body: { ...fields, categoryId: categoryIdRef.current },
        });
        idRef.current = created.id;
        persistedRef.current = true;
        setLastEdited(created.lastEdited);
      } else {
        const updated = await apiFetch<Note>(`/notes/${idRef.current}`, {
          method: "PATCH",
          body: fields,
        });
        setLastEdited(updated.lastEdited);
      }
      invalidate();
    },
    [invalidate],
  );

  // Create the row as soon as the editor opens for a brand-new note, so the
  // timestamp is real and server-derived rather than a client guess. The ref
  // is set before the request is issued, so neither a StrictMode double-mount
  // nor a re-render can produce a second note.
  useEffect(() => {
    if (createStartedRef.current) {
      return;
    }
    createStartedRef.current = true;
    enqueue(() => performSave({ title: "", content: "" })).catch((error: unknown) => {
      console.error("Failed to create note", error);
    });
  }, [enqueue, performSave]);

  const scheduleSave = useCallback(
    (fields: DraftFields) => {
      // Track the latest fields immediately (not just at timer fire) so
      // `close()` can flush or discard synchronously without waiting out
      // the debounce window.
      pendingRef.current = fields;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const toSave = pendingRef.current;
        pendingRef.current = null;
        if (toSave) {
          enqueue(() => performSave(toSave)).catch((error: unknown) => {
            console.error("Failed to save note", error);
          });
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [enqueue, performSave],
  );

  const updateTitle = useCallback(
    (value: string) => {
      setTitle(value);
      scheduleSave({ title: value, content });
    },
    [content, scheduleSave],
  );

  const updateContent = useCallback(
    (value: string) => {
      setContent(value);
      scheduleSave({ title, content: value });
    },
    [title, scheduleSave],
  );

  const updateCategory = useCallback(
    (nextCategoryId: number) => {
      // FR-15: the category control writes immediately, no debounce —
      // still funneled through `enqueue` so it never races a pending
      // title/content save for the same note.
      setCategoryId(nextCategoryId);
      categoryIdRef.current = nextCategoryId;
      if (idRef.current !== null) {
        enqueue(() =>
          apiFetch<Note>(`/notes/${idRef.current}`, {
            method: "PATCH",
            body: { categoryId: nextCategoryId },
          }),
        )
          .then(invalidate)
          .catch((error: unknown) => {
            console.error("Failed to update note category", error);
          });
      }
    },
    [enqueue, invalidate],
  );

  const close = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;

    // A blank note is kept like any other: no empty-guard, no DELETE. Only
    // the outstanding write still has to land before the editor closes.
    try {
      if (pending) {
        await enqueue(() => performSave(pending));
      } else {
        // No pending edit, but an earlier save may still be in flight.
        await chainRef.current;
      }
    } catch (error) {
      console.error("Failed to close note", error);
    } finally {
      onClose();
    }
  }, [enqueue, onClose, performSave]);

  return {
    title,
    content,
    categoryId,
    lastEdited,
    updateTitle,
    updateContent,
    updateCategory,
    close,
  };
}
