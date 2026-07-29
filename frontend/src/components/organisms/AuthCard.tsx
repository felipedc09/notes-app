import type { ReactNode } from "react";

interface AuthCardProps {
  heading: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Shared visual shell for the sign-up and login screens (FR-01, FR-02, FR-06).
 */
export function AuthCard({ heading, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)]">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--color-heading)]">
        {heading}
      </h1>
      {children}
      <div className="text-sm text-[var(--color-heading)]">{footer}</div>
    </div>
  );
}
