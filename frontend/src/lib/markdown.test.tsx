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

  it("renders a bulleted list as a real ul/li carrying the .markdown class", () => {
    // The markers themselves come from `.markdown` in globals.css — Preflight
    // strips list-style, so the class is what makes the bullets visible.
    const { container } = render(<Markdown content={"- Milk\n- Eggs\n- Bread"} />);

    const list = container.querySelector("ul");
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll("li")).toHaveLength(3);
    expect(container.firstElementChild).toHaveClass("markdown");
    expect(container.firstElementChild).not.toHaveClass("markdown-preview");
  });

  it("renders an ordered list and nested items", () => {
    const { container } = render(<Markdown content={"1. First\n2. Second\n   - Nested"} />);

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("ol li ul li")).not.toBeNull();
  });

  it("keeps list markers in card previews but marks them for collapsed spacing", () => {
    const { container } = render(<Markdown content={"- Milk\n- Eggs"} preview />);

    expect(container.firstElementChild).toHaveClass("markdown", "markdown-preview");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("preserves inline emphasis and strikethrough", () => {
    const { container } = render(<Markdown content={"**bold** _italic_ ~~gone~~"} />);

    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
    expect(container.querySelector("del")).toHaveTextContent("gone");
  });

  it("strips block-level elements in preview mode so text stays inline", () => {
    render(<Markdown content={"# Heading\n\nBody text"} preview />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
});
