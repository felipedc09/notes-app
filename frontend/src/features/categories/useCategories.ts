"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Category {
  id: number;
  name: string;
  color: string;
  noteCount: number;
}

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

/**
 * GET /api/categories (design.md §3). `noteCount` is server-computed
 * (NFR-05) — the sidebar never derives it from the notes list.
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => apiFetch<Category[]>("/categories"),
  });
}
