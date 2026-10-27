"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "./avatar";
import { controlClass } from "./input";
import { ChevronDownIcon } from "../icons";

// hint — другий рядок варіанта приглушеним текстом (наприклад, email опікуна біля дитини).
export type SelectOption = { value: string; label: string; hint?: string };

// Власний Select (розділ 4.1): патерн WAI-ARIA «select-only combobox», без нативного <select>.
// Тригер — пігулка 48px з колом ініціалів вибраного; спливаюча панель accent, варіанти 48px з ініціалами.
// Значення йде у форму через <input type="hidden" name=…>, тож імена полів (therapist, client_id) не змінюються.
// Підпис — <label htmlFor={id}> у Field (кнопка — labelable-елемент).
export function Select({
  id,
  name,
  options,
  defaultValue = "",
  placeholder,
  onChange,
  avatars = true,
  invalid,
}: {
  id: string;
  name?: string; // без name — значення лише через onChange (одне поле для кількох форм)
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  avatars?: boolean; // коло з ініціалами — для людей (терапевт, клієнт), не для значень на кшталт мови
  invalid?: boolean; // aria-invalid на тригері — межа destructive, як у Input
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

  // Фокус лишається на тригері (aria-activedescendant), тож активний варіант прокручуємо в зону видимості самі.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const openList = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActive(Math.max(0, index));
    setOpen(true);
  };

  // Єдина точка фіксації значення: і прихований input, і onChange бачать той самий вибір (Enter, клік, Tab).
  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    setValue(option.value);
    onChange?.(option.value);
  };

  const choose = (index: number) => {
    commit(index);
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
        commit(active);
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
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${controlClass} cursor-pointer py-0 pr-2 ${selected && avatars ? "pl-1.5" : "pl-4"} ${open ? "outline-2 outline-offset-2 outline-ring" : ""}`}
      >
        {selected && avatars ? <Avatar name={selected.label} className="size-[34px] text-xs" /> : null}
        <span className={`min-w-0 flex-1 truncate ${selected ? "font-semibold" : "text-muted-foreground"}`}>
          {selected ? selected.label : (placeholder ?? "")}
          {/* Підказка вибраного й у закритому полі: двоє дітей з однаковим ім'ям розрізняються опікуном. */}
          {selected?.hint ? (
            <span className="block truncate text-xs font-medium text-muted-foreground">{selected.hint}</span>
          ) : null}
        </span>
        <span aria-hidden className="grid size-[34px] flex-none place-items-center rounded-full text-muted-foreground">
          <ChevronDownIcon className={`size-4 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute top-[calc(100%+8px)] left-0 z-20 m-0 max-h-80 min-w-full list-none overflow-y-auto rounded-lg border border-card-border bg-accent p-1.5 shadow-pop backdrop-blur-[24px]"
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
                // Активний (клавіатура, наведення) — фон і рамка; вибраний — жирний текст і галочка, без фону.
                className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md px-2.5 font-medium ${
                  index === active ? "bg-card ring-1 ring-input ring-inset" : ""
                } ${isSelected ? "font-bold" : ""}`}
              >
                {avatars ? <Avatar name={option.label} className="size-8 text-[11px]" /> : null}
                <span className="min-w-0 flex-1">
                  {option.label}
                  {option.hint ? (
                    <span className="block text-xs font-medium break-all text-muted-foreground">{option.hint}</span>
                  ) : null}
                </span>
                {isSelected ? (
                  <svg aria-hidden viewBox="0 0 12 12" className="size-3.5 flex-none text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 6.5l2.5 2.5L10 3.5" />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
