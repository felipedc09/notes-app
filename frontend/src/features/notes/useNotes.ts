"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Note {
  id: number;
  title: string;
  content: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  createdAt: string;
  lastEdited: string;
}

export const NOTES_QUERY_KEY = ["notes"] as const;

/**
 * GET /api/notes[?category={id}] (design.md §3). `categoryId === null`
 * fetches the unfiltered "All Categories" list (FR-19). The query key nests
 * the filter under the shared `["notes"]` prefix so slice 5's
 * `invalidateQueries(["notes"])` after every mutation refetches whichever
 * filter is currently active.
 */
export function useNotes(categoryId: number | null) {
  return useQuery<Note[]>({
    queryKey: [...NOTES_QUERY_KEY, categoryId],
    queryFn: () =>
      apiFetch<Note[]>(
        categoryId !== null ? `/notes?category=${categoryId}` : "/notes",
      ),
  });
}
