/** FR-08: shown when the current view (all notes, or the selected
 * category's notes) has zero notes. */
export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <EmptyStateIllustration />
      <p className="max-w-sm text-lg font-bold text-[var(--color-heading)]">
        I&apos;m just here waiting for your charming notes&hellip;
      </p>
    </div>
  );
}

function EmptyStateIllustration() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      role="img"
      aria-label="An empty notebook"
    >
      <rect
        x="30"
        y="24"
        width="100"
        height="120"
        rx="11"
        fill="var(--color-cat-personal)"
        opacity="0.5"
      />
      <rect
        x="30"
        y="24"
        width="100"
        height="120"
        rx="11"
        stroke="var(--color-accent)"
        strokeWidth="3"
      />
      <line x1="50" y1="56" x2="110" y2="56" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="78" x2="110" y2="78" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="100" x2="90" y2="100" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
