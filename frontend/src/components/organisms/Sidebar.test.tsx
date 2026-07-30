import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw-server";
import { Sidebar } from "./Sidebar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Sidebar />
    </QueryClientProvider>,
  );
}

describe("Sidebar (FR-18, A3)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("shows a bare count only for categories with at least one note", async () => {
    server.use(
      http.get("/api/categories", () =>
        HttpResponse.json([
          { id: 1, name: "Random Thoughts", color: "#ef9c66", noteCount: 0 },
          { id: 2, name: "School", color: "#fcdc94", noteCount: 3 },
          { id: 3, name: "Personal", color: "#78aba8", noteCount: 0 },
        ]),
      ),
    );

    renderSidebar();

    expect(await screen.findByText("School")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    // "All Categories" and the two zero-count categories render no count at
    // all — a bare "0" must never appear.
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });

  it("always renders All Categories first", async () => {
    server.use(
      http.get("/api/categories", () =>
        HttpResponse.json([
          { id: 1, name: "Random Thoughts", color: "#ef9c66", noteCount: 1 },
        ]),
      ),
    );

    renderSidebar();
    await screen.findByText("Random Thoughts");

    const items = screen.getAllByRole("button");
    expect(items[0]).toHaveTextContent("All Categories");
  });
});
