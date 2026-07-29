"use client";

// Placeholder landing page behind AuthGate. The real dashboard (sidebar,
// note grid, empty state) is Slice 4 scope — this only proves the Slice 1
// auth flow end-to-end (Q2: signup/login land here, "All Categories").
import { Button } from "@/components/atoms/Button";
import { useLogout, useMe } from "@/features/auth/useAuth";

export default function Home() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-4">
      <h1 className="text-2xl font-bold text-[var(--color-heading)]">
        All Categories
      </h1>
      {user && <p className="text-[var(--color-heading)]">Signed in as {user.email}</p>}
      <Button
        type="button"
        variant="secondary"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        Log out
      </Button>
    </main>
  );
}
