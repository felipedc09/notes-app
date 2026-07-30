import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/features/categories/useCategories";
import type { Note } from "@/features/notes/useNotes";
import { server } from "@/test/msw-server";
import { NoteEditor } from "./NoteEditor";

const categories: Category[] = [
  { id: 1, name: "Random Thoughts", color: "#ef9c66", noteCount: 0 },
  { id: 2, name: "School", color: "#fcdc94", noteCount: 0 },
  { id: 3, name: "Personal", color: "#78aba8", noteCount: 0 },
];

function noteResponse(overrides: Partial<Note> = {}): Note {
  return {
    id: 1,
    title: "",
    content: "",
    categoryId: 1,
    categoryName: "Random Thoughts",
    categoryColor: "#ef9c66",
    createdAt: new Date().toISOString(),
    lastEdited: new Date().toISOString(),
    ...overrides,
  };
}

function renderEditor(note: Note | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <NoteEditor note={note} categories={categories} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("NoteEditor draft state machine (FR-09, FR-27, R5, R6)", () => {
  it("fires exactly one POST no matter how much rapid typing happens before it settles (R5, FR-09)", async () => {
    let postCount = 0;
    server.use(
      http.post("/api/notes", async ({ request }) => {
        postCount += 1;
        const body = (await request.json()) as { title: string; content: string };
        return HttpResponse.json(noteResponse(body), { status: 201 });
      }),
      http.patch("/api/notes/1", async ({ request }) => {
        const body = (await request.json()) as Partial<Note>;
        return HttpResponse.json(noteResponse(body));
      }),
    );

    const user = userEvent.setup();
    renderEditor(null);

    const content = screen.getByPlaceholderText("Pour your heart out...");
    await user.type(content, "Hello");
    // Well inside the 500ms debounce window — must not trigger a save yet.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await user.type(content, " world");

    await waitFor(() => expect(postCount).toBe(1), { timeout: 2000 });
    // Give any accidental second POST time to arrive before asserting.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(postCount).toBe(1);
  }, 10000);

  it("keeps a persisted note when both fields are cleared and the editor is closed", async () => {
    let deleteCalled = false;
    let lastPatch: Partial<Note> | null = null;
    server.use(
      http.patch("/api/notes/5", async ({ request }) => {
        const body = (await request.json()) as Partial<Note>;
        lastPatch = body;
        return HttpResponse.json(noteResponse({ id: 5, ...body }));
      }),
      http.delete("/api/notes/5", () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const existingNote = noteResponse({ id: 5, title: "Old title", content: "Old content" });
    const user = userEvent.setup();
    const { onClose } = renderEditor(existingNote);

    await user.click(screen.getByRole("heading", { name: "Old title" }));
    const titleInput = screen.getByDisplayValue("Old title");
    await user.clear(titleInput);

    await user.click(screen.getByText("Old content"));
    const contentInput = screen.getByDisplayValue("Old content");
    await user.clear(contentInput);

    await user.click(screen.getByRole("button", { name: "Close note" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // The cleared state is saved, and the row survives.
    expect(lastPatch).toEqual({ title: "", content: "" });
    expect(deleteCalled).toBe(false);
  }, 10000);

  it("creates the note on open and shows its timestamp immediately", async () => {
    let postBody: { title: string; content: string } | null = null;
    server.use(
      http.post("/api/notes", async ({ request }) => {
        postBody = (await request.json()) as { title: string; content: string };
        return HttpResponse.json(
          noteResponse({ ...postBody, lastEdited: "2026-07-30T15:04:00.000Z" }),
          { status: 201 },
        );
      }),
    );

    renderEditor(null);

    // The timestamp is server-derived, so its presence proves the row exists.
    await waitFor(() => expect(screen.getByText(/^Last Edited:/)).toBeInTheDocument());
    expect(postBody).toEqual({ title: "", content: "", categoryId: 1 });
  }, 10000);

  it("re-reads the CSRF token from the cookie on every unsafe request, even after login rotation (R6, NFR-04)", async () => {
    const seenTokens: string[] = [];
    server.use(
      http.post("/api/notes", async ({ request }) => {
        seenTokens.push(request.headers.get("x-csrftoken") ?? "");
        return HttpResponse.json(noteResponse({ id: 9, title: "a" }), { status: 201 });
      }),
      http.patch("/api/notes/9", async ({ request }) => {
        seenTokens.push(request.headers.get("x-csrftoken") ?? "");
        return HttpResponse.json(noteResponse({ id: 9, title: "ab" }));
      }),
    );

    document.cookie = "csrftoken=token-before";
    const user = userEvent.setup();
    renderEditor(null);

    const titleInput = screen.getByPlaceholderText("Note Title");
    await user.type(titleInput, "a");
    await waitFor(() => expect(seenTokens).toHaveLength(1), { timeout: 2000 });

    document.cookie = "csrftoken=token-after";
    await user.type(titleInput, "b");
    await waitFor(() => expect(seenTokens).toHaveLength(2), { timeout: 2000 });

    expect(seenTokens).toEqual(["token-before", "token-after"]);
  }, 10000);
});
