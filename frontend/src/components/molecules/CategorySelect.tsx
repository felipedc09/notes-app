"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ColorDot } from "@/components/atoms/ColorDot";
import type { Category } from "@/features/categories/useCategories";

interface CategorySelectProps {
  categories: Category[];
  value: number;
  onChange: (categoryId: number) => void;
}

/**
 * Chevron from the Figma `Iconography - Caesarzkn` node (6:16902): a
 * 20 x 10.0276 glyph centered in a 24px box. Path data is the exported
 * asset verbatim; only the literal #957139 fill is bound to its token.
 */
function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center">
      <svg
        width="20"
        height="10.0276"
        viewBox="0 0 20 10.0276"
        fill="none"
        aria-hidden="true"
        className={`transition-transform ${open ? "rotate-180" : ""}`}
      >
        <path
          d="M19.6273 1.77882L10.6273 9.77882C10.2498 10.1105 9.68479 10.1105 9.30728 9.77882L0.307282 1.77882C-0.078802 1.40798 -0.104364 0.798869 0.249291 0.396987C0.602947 -0.00489405 1.21037 -0.0569828 1.62728 0.278819L9.96728 7.68882L18.3073 0.278819C18.5724 0.024125 18.956 -0.0645167 19.306 0.0479976C19.6561 0.160512 19.9161 0.456033 19.9832 0.81753C20.0503 1.17903 19.9136 1.54819 19.6273 1.77882Z"
          fill="var(--color-accent)"
        />
      </svg>
    </span>
  );
}

/**
 * FR-15: single-select dropdown listing the seeded categories, inside the
 * note editor.
 *
 * Implemented as an ARIA listbox rather than a native `<select>`: a browser
 * renders `<option>` elements through the OS, so the popup cannot carry the
 * design's background, radius, or hover state at all. Owning the popup as
 * real DOM is the only way to style it, and the cost is that the keyboard
 * behavior a native select provides for free has to be implemented here.
 */
export function CategorySelect({ categories, value, onChange }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selectedIndex = categories.findIndex((category) => category.id === value);
  const selected = selectedIndex === -1 ? undefined : categories[selectedIndex];

  // Move DOM focus into the list so arrow keys and Escape are captured.
  useEffect(() => {
    if (open) {
      listRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Opening starts from the current selection, the way a native select does.
  function openList() {
    setActiveIndex(selectedIndex === -1 ? 0 : selectedIndex);
    setOpen(true);
  }

  function close({ refocus }: { refocus: boolean }) {
    setOpen(false);
    if (refocus) {
      triggerRef.current?.focus();
    }
  }

  function commit(index: number) {
    const category = categories[index];
    if (category) {
      onChange(category.id);
    }
    close({ refocus: true });
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    }
  }

  function handleListKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, categories.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(categories.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        close({ refocus: true });
        break;
      case "Tab":
        close({ refocus: false });
        break;
      default:
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative w-[225px]">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Category"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? close({ refocus: false }) : openList())}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-[39px] w-full items-center gap-2 rounded-md border border-[var(--color-accent)] bg-transparent px-[15px] py-[7px] text-left text-xs text-black"
      >
        {selected && <ColorDot color={selected.color} />}
        <span className="min-w-0 flex-1 truncate">{selected?.name ?? "Category"}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Category"
          aria-activedescendant={`${listboxId}-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          // No vertical padding: the design's 142px open height is exactly
          // the 39px trigger + 7px gap + 3 rows of 32px. The shadow is a
          // deliberate addition — the mock shows this panel over the flat
          // page background, but in the editor it overlays a category-tinted
          // note surface, where an unshadowed edge disappears.
          className="absolute top-full left-0 z-20 mt-[7px] w-[225px] overflow-hidden rounded-lg bg-[var(--color-bg)] shadow-[var(--shadow-card)] outline-none"
        >
          {categories.map((category, index) => (
            <li
              key={category.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={category.id === value}
              onClick={() => commit(index)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex h-8 cursor-pointer items-center gap-2 px-4 text-xs text-black ${
                index === activeIndex ? "bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]" : ""
              }`}
            >
              <ColorDot color={category.color} />
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
