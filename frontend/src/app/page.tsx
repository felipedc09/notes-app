"use client";

// Dashboard shell (FR-08, FR-18–FR-23, NFR-01): a fixed-width sidebar plus a
// read-only note grid. Notes are clickable/editable starting in Slice 5 —
// this shell only displays and filters.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/organisms/EmptyState";
import { NoteGrid } from "@/components/organisms/NoteGrid";
import { Sidebar } from "@/components/organisms/Sidebar";
import { useNotes } from "@/features/notes/useNotes";

function DashboardBody() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const categoryId = categoryParam !== null ? Number(categoryParam) : null;
  const { data: notes } = useNotes(categoryId);

  return (
    <>
      <Sidebar />
      <main className="flex flex-1 flex-col p-8" aria-label="Notes">
        {notes && notes.length === 0 ? (
          <EmptyState />
        ) : (
          <NoteGrid notes={notes ?? []} />
        )}
      </main>
    </>
  );
}

// NFR-01: desktop-only fixed 1280 shell; no responsive breakpoints, no
// mobile styles anywhere in the dashboard tree.
export default function Home() {
  return (
    <div className="flex min-h-screen min-w-[1280px] bg-[var(--color-bg)]">
      <Suspense fallback={null}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}
