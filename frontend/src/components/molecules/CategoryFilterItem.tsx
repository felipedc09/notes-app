import { ColorDot } from "@/components/atoms/ColorDot";

interface CategoryFilterItemProps {
  label: string;
  color?: string;
  count?: number;
  active: boolean;
  onSelect: () => void;
}

/**
 * One sidebar row: color dot (when a category color is given) + name, with
 * the note count in parentheses shown only when it is at least 1 (Decision
 * A3, FR-18). "All Categories" has no color and no count.
 */
export function CategoryFilterItem({
  label,
  color,
  count,
  active,
  onSelect,
}: CategoryFilterItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-[var(--radius-card)] px-3 py-2 text-left text-sm font-bold transition-colors ${
        active
          ? "bg-[var(--color-accent)] text-white"
          : "text-[var(--color-heading)] hover:bg-black/5"
      }`}
    >
      {color && <ColorDot color={color} />}
      <span>{label}</span>
      {typeof count === "number" && count > 0 && <span>({count})</span>}
    </button>
  );
}
