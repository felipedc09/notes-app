import Image from "next/image";

/** FR-08: shown when the current view (all notes, or the selected
 * category's notes) has zero notes. */
export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <Image
        src="/illustrations/empty-state.png"
        alt="A cup of bubble tea"
        width={297}
        height={296}
      />
      <p className="max-w-sm text-lg font-bold text-[var(--color-heading)]">
        I’m just here waiting for your charming notes...
      </p>
    </div>
  );
}
