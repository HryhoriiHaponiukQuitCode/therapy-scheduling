"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { controlClass } from "./input";
import { OptionContent, optionClass, popupClass, TriggerValue, type SelectOption } from "./select";
import { SearchIcon } from "../icons";

export type ComboboxResults = { options: SelectOption[]; notice: string | null; error: string | null };

// Вибір зі списку з пошуком в одному полі (DESIGN.md, розділ 5 і «Патерни взаємодії»): закрите поле — як Select,
// у спливаючій панелі зверху поле пошуку (WAI-ARIA combobox зі списком), під ним варіанти й рядок стану.
// Порожній запит — початкові варіанти; інакше search(q) з паузою SEARCH_DELAY_MS після введення (відповідь на
// старіший запит відкидаємо). Вибраний варіант лишається вибраним, навіть коли нового пошуку він не потрапив у список.
// Значення — через onChange (одне поле для кількох форм) або прихований <input name>.
const SEARCH_DELAY_MS = 250;

export function Combobox({
  id,
  name,
  initial,
  search,
  placeholder,
  searchLabel,
  searchPlaceholder,
  onChange,
  avatars = true,
  maxLength,
}: {
  id: string;
  name?: string;
  initial: ComboboxResults;
  search: (q: string) => Promise<ComboboxResults>;
  placeholder?: string;
  searchLabel: string; // aria-label поля пошуку
  searchPlaceholder?: string;
  onChange?: (value: string) => void;
  avatars?: boolean;
  maxLength?: number;
}) {
  const listId = useId();
  const statusId = useId();
  const [selected, setSelected] = useState<SelectOption | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);

  const options = results.options;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Фокус лишається в полі пошуку (aria-activedescendant), тож активний варіант прокручуємо в зону видимості самі.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const onQuery = (text: string) => {
    setQuery(text);
    setActive(0);
    const id = ++request.current;
    if (!text.trim()) {
      setPending(false);
      setResults(initial);
      return;
    }
    setPending(true);
    setTimeout(async () => {
      if (id !== request.current) return;
      let next: ComboboxResults;
      try {
        next = await search(text);
      } catch {
        next = { options: [], notice: null, error: "Could not search. Try again." };
      }
      if (id !== request.current) return;
      setResults(next);
      setPending(false);
    }, SEARCH_DELAY_MS);
  };

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    setSelected(option);
    onChange?.(option.value);
    close(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case "Enter":
        event.preventDefault();
        choose(active);
        return;
      case "Escape":
        event.preventDefault();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
    }
  };

  const status = pending ? "Searching…" : (results.error ?? results.notice);

  return (
    <div ref={rootRef} className="relative w-full">
      {name ? <input type="hidden" name={name} value={selected?.value ?? ""} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        // Поки список відкритий, фокус — у полі пошуку: власного кільця тригер не малює (одне виділення на екрані).
        className={`${controlClass} cursor-pointer py-0 pr-2 ${selected && avatars ? "pl-1.5" : "pl-4"}`}
      >
        <TriggerValue selected={selected} placeholder={placeholder} avatars={avatars} open={open} />
      </button>
      {open ? (
        <div className={`${popupClass} flex w-full min-w-[280px] flex-col gap-1.5 p-1.5`}>
          <label className={`${controlClass} min-h-11 px-3.5 focus-within:border-ring`}>
            <SearchIcon className="size-4 flex-none text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label={searchLabel}
              aria-expanded
              aria-autocomplete="list"
              aria-controls={listId}
              aria-describedby={statusId}
              aria-activedescendant={options.length > 0 ? `${listId}-${active}` : undefined}
              value={query}
              maxLength={maxLength}
              placeholder={searchPlaceholder}
              autoComplete="off"
              onChange={(event) => onQuery(event.target.value)}
              onKeyDown={onKeyDown}
              // Фокус показує межа всієї пігулки (border-ring, focus-within) — одна лінія, без прямокутника на
              // самому полі: глобальний :focus-visible (globals.css, поза шарами) перебиває утиліту, тому outline-none!.
              className="min-w-0 flex-1 bg-transparent outline-none! placeholder:text-muted-foreground"
            />
          </label>
          <ul id={listId} role="listbox" aria-label={searchLabel} className="m-0 max-h-72 list-none overflow-y-auto p-0">
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === selected?.value}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                onPointerEnter={() => setActive(index)}
                className={optionClass(index === active, option.value === selected?.value)}
              >
                <OptionContent option={option} selected={option.value === selected?.value} avatars={avatars} />
              </li>
            ))}
          </ul>
          <p
            id={statusId}
            role="status"
            className={status ? `m-0 px-2.5 py-1.5 text-xs ${results.error && !pending ? "text-destructive" : "text-muted-foreground"}` : "m-0"}
          >
            {status}
          </p>
        </div>
      ) : null}
    </div>
  );
}
