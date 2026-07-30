"use client";

// Dashboard shell (FR-08, FR-09, FR-18–FR-24, NFR-01): a fixed-width sidebar,
// a "New Note" pill (FR-09), and a note grid whose cards open the editor
// overlay (FR-24).
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/organisms/EmptyState";
import { NoteEditor } from "@/components/organisms/NoteEditor";
import { NoteGrid } from "@/components/organisms/NoteGrid";
import { Sidebar } from "@/components/organisms/Sidebar";
import { useCategories } from "@/features/categories/useCategories";
import { useNotes, type Note } from "@/features/notes/useNotes";

// `"new"` = a brand-new in-memory draft (FR-09); a number = an existing
// note's id (FR-24); `null` = the editor is closed.
type EditorTarget = "new" | number | null;

function DashboardBody() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const categoryId = categoryParam !== null ? Number(categoryParam) : null;
  const { data: notes } = useNotes(categoryId);
  const { data: categories } = useCategories();
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);

  const openNote: Note | null =
    typeof editorTarget === "number"
      ? (notes?.find((candidate) => candidate.id === editorTarget) ?? null)
      : null;

  return (
    <>
      <Sidebar />
      <main className="flex flex-1 flex-col gap-6 p-8" aria-label="Notes">
        <div className="flex justify-end">
          <Button className="!rounded-full" onClick={() => setEditorTarget("new")}>
            <span aria-hidden="true">+</span> New Note
          </Button>
        </div>
        {notes && notes.length === 0 ? (
          <EmptyState />
        ) : (
          <NoteGrid notes={notes ?? []} onSelect={(id) => setEditorTarget(id)} />
        )}
      </main>
      {editorTarget !== null && categories && (
        <NoteEditor
          key={editorTarget}
          note={editorTarget === "new" ? null : openNote}
          categories={categories}
          onClose={() => setEditorTarget(null)}
        />
      )}
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
