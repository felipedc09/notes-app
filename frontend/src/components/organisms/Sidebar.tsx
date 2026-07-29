"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CategoryFilterItem } from "@/components/molecules/CategoryFilterItem";
import { useCategories } from "@/features/categories/useCategories";

/**
 * FR-18/FR-19: "All Categories" first, then the user's three categories.
 * The `?category=` URL param is the single source of filter truth so the
 * grid and the active sidebar highlight can never drift out of sync.
 */
export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: categories } = useCategories();
  const activeCategoryId = searchParams.get("category");

  function selectCategory(id: number | null) {
    router.push(id === null ? "/" : `/?category=${id}`);
  }

  return (
    <nav
      aria-label="Categories"
      className="flex w-56 flex-shrink-0 flex-col gap-1 border-r border-[var(--color-accent)]/20 p-4"
    >
      <CategoryFilterItem
        label="All Categories"
        active={activeCategoryId === null}
        onSelect={() => selectCategory(null)}
      />
      {categories?.map((category) => (
        <CategoryFilterItem
          key={category.id}
          label={category.name}
          color={category.color}
          count={category.noteCount}
          active={activeCategoryId === String(category.id)}
          onSelect={() => selectCategory(category.id)}
        />
      ))}
    </nav>
  );
}
