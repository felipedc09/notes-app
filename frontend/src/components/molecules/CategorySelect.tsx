import { ColorDot } from "@/components/atoms/ColorDot";
import type { Category } from "@/features/categories/useCategories";

interface CategorySelectProps {
  categories: Category[];
  value: number;
  onChange: (categoryId: number) => void;
}

/**
 * FR-15: single-select dropdown listing the three seeded categories,
 * inside the note editor. The selected category's color dot mirrors the
 * `.note-surface` tint so the control visually matches the note it edits.
 */
export function CategorySelect({ categories, value, onChange }: CategorySelectProps) {
  const selected = categories.find((category) => category.id === value);

  return (
    <div className="flex items-center gap-2">
      {selected && <ColorDot color={selected.color} />}
      <select
        aria-label="Category"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-[var(--radius-card)] border border-[var(--color-accent)] bg-transparent px-2 py-1 text-sm font-bold text-[var(--color-heading)] outline-none"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
