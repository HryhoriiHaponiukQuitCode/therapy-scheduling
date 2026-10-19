"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { controlClass } from "./field";
import { ChevronDownIcon } from "./icons";

export type SelectOption = { value: string; label: string };

// Власний Select (розділ 4.1): патерн WAI-ARIA «select-only combobox», без нативного <select>.
// Значення йде у форму через <input type="hidden" name=…>, тож імена полів (therapist, client_id) не змінюються.
// Підпис — <label htmlFor={id}> у Field (кнопка — labelable-елемент).
export function Select({
  id,
  name,
  options,
  defaultValue = "",
  placeholder,
}: {
  id: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const openList = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActive(Math.max(0, index));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) setValue(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        return;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        return;
      case "Tab": {
        // Як у нативного select: Tab фіксує підсвічений варіант і пускає фокус далі.
        const option = options[active];
        if (option) setValue(option.value);
        setOpen(false);
        return;
      }
    }
    // Набір літер переходить до варіанта.
    if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at < 700 ? t.text + event.key.toLowerCase() : event.key.toLowerCase();
      t.at = now;
      const found = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
      if (found >= 0) setActive(found);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${controlClass} cursor-pointer`}
      >
        <span className={`flex-1 truncate ${selected ? "" : "text-muted"}`}>
          {selected ? selected.label : (placeholder ?? "")}
        </span>
        <ChevronDownIcon className={`size-4 flex-none text-muted ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute top-[calc(100%+6px)] left-0 z-10 m-0 max-h-72 min-w-full list-none overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-pop"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                onPointerEnter={() => setActive(index)}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 ${
                  index === active ? "bg-subtle" : ""
                } ${isSelected ? "font-semibold" : ""}`}
              >
                <span aria-hidden className="flex w-3 flex-none">
                  {isSelected ? (
                    <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M2 6.5l2.5 2.5L10 3.5" />
                    </svg>
                  ) : null}
                </span>
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
