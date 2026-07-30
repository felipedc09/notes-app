import type { ReactNode } from "react";

interface AuthCardProps {
  heading: string;
  illustration: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Shared visual shell for the sign-up and login screens (FR-01, FR-02, FR-06).
 * The design has no card/panel — content sits centered directly on the page
 * background, with a screen-specific illustration above the heading.
 */
export function AuthCard({ heading, illustration, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[384px] flex-col items-center text-center">
      <div className="mb-[13px]">{illustration}</div>
      <h1 className="mb-9 font-[family-name:var(--font-heading)] text-5xl font-bold text-[var(--color-heading)]">
        {heading}
      </h1>
      <div className="w-full">{children}</div>
      <div className="mt-[13px] text-sm">{footer}</div>
    </div>
  );
}
