import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown (FR-26)", () => {
  it("escapes a raw <script> tag instead of executing it", () => {
    const { container } = render(<Markdown content={"<script>window.__xss = true;</script>"} />);
    // react-markdown never uses dangerouslySetInnerHTML — a <script> tag in
    // the source must not become a live script element in the DOM.
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
  });

  it("drops a javascript: href via the default urlTransform", () => {
    render(<Markdown content={"[click me](javascript:alert(1))"} />);
    const link = screen.getByText("click me");
    expect(link.getAttribute("href")).not.toMatch(/^javascript:/i);
  });

  it("renders a safe link with rel=noopener noreferrer", () => {
    render(<Markdown content={"[docs](https://example.com)"} />);
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("strips block-level elements in preview mode so text stays inline", () => {
    render(<Markdown content={"# Heading\n\nBody text"} preview />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
});
