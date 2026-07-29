interface ColorDotProps {
  color: string;
  className?: string;
}

/** Small circular swatch used by category filter items and note cards
 * (FR-18, NFR-06). Decorative only — the category name carries the label. */
export function ColorDot({ color, className = "" }: ColorDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 flex-shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
