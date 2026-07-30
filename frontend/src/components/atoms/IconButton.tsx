import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

/**
 * Icon-only button. `label` is required and becomes the accessible name via
 * `aria-label` since there is no visible text. Used by the note editor's
 * close control and "New Note" pill (slice 5) and available here for any
 * icon-affordance dashboard chrome needs.
 */
export function IconButton({
  icon,
  label,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-accent)] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
