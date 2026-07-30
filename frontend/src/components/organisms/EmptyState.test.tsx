import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState (FR-08)", () => {
  it("shows the exact empty-state copy", () => {
    render(<EmptyState />);
    expect(
      screen.getByText("I’m just here waiting for your charming notes..."),
    ).toBeInTheDocument();
  });

  it("includes an illustration", () => {
    render(<EmptyState />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
