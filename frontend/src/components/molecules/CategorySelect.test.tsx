import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/features/categories/useCategories";
import { CategorySelect } from "./CategorySelect";

const categories: Category[] = [
  { id: 1, name: "Random Thoughts", color: "#ef9c66", noteCount: 0 },
  { id: 2, name: "School", color: "#fcdc94", noteCount: 0 },
  { id: 3, name: "Personal", color: "#78aba8", noteCount: 0 },
];

function renderSelect(value = 1) {
  const onChange = vi.fn();
  render(<CategorySelect categories={categories} value={value} onChange={onChange} />);
  return { onChange, trigger: screen.getByRole("button", { name: "Category" }) };
}

describe("CategorySelect", () => {
  it("shows the selected category and keeps the list closed initially", () => {
    const { trigger } = renderSelect(2);

    expect(trigger).toHaveTextContent("School");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens on click and marks the current value as selected", async () => {
    const user = userEvent.setup();
    const { trigger } = renderSelect(3);

    await user.click(trigger);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Personal" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "School" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("selects an option by click and closes", async () => {
    const user = userEvent.setup();
    const { onChange, trigger } = renderSelect();

    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Personal" }));

    expect(onChange).toHaveBeenCalledWith(3);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens with ArrowDown and selects with Enter, starting from the current value", async () => {
    const user = userEvent.setup();
    const { onChange, trigger } = renderSelect(1);

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    // Opens on the selected option ("Random Thoughts"), so one more step
    // down lands on "School".
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("closes on Escape without changing the value, and restores focus", async () => {
    const user = userEvent.setup();
    const { onChange, trigger } = renderSelect();

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    const { trigger } = renderSelect();

    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
