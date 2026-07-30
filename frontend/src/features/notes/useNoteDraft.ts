"use client";

import { useCallback, useRef, useState } from "react";
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
 * Draft lifecycle state machine (design.md §3, FR-09/FR-10/FR-27, risk R5).
 *
 * "New Note" produces a purely in-memory draft: no id, no request. The
 * first keystroke schedules a debounced `POST /api/notes`; every keystroke
 * after that schedules a debounced `PATCH /api/notes/{id}`. All network
 * writes for this draft are funneled through `enqueue`, a single promise
 * chain, so the first POST always resolves — and `idRef` is set — before
 * any later write fires. That single in-flight lock is what stops rapid
 * typing from creating duplicate notes.
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

    const finalTitle = pending ? pending.title : title;
    const finalContent = pending ? pending.content : content;
    const isBlank = finalTitle.trim() === "" && finalContent.trim() === "";

    try {
      if (isBlank) {
        if (persistedRef.current) {
          // The backend's empty-guard (3.6) checks the *stored* row, not
          // what the client thinks the fields are. If a clearing edit is
          // still pending, the server's copy is still the old non-blank
          // content, and a DELETE against it would 409 — flush it first so
          // the guard actually sees a blank note before the empty-guarded
          // DELETE (backend 3.6).
          if (pending) {
            await enqueue(() => performSave(pending));
          } else {
            await chainRef.current;
          }
          await enqueue(() =>
            apiFetch<void>(`/notes/${idRef.current}`, { method: "DELETE" }),
          );
          invalidate();
        }
        // Never persisted & both blank: in-memory discard, zero requests.
      } else if (pending) {
        // Otherwise: flush the pending edit (create-or-update) before close.
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
  }, [content, enqueue, invalidate, onClose, performSave, title]);

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
