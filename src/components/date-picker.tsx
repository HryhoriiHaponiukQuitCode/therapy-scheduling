"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "./button";
import { controlClass } from "./field";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Дати як рядки YYYY-MM-DD; арифметика в UTC, щоб не залежати від часового поясу браузера.
function parse(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function format(date: Date) {
  return date.toISOString().slice(0, 10);
}
function shiftDays(date: string, days: number) {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}
function shiftMonths(date: string, months: number) {
  const d = parse(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return format(target);
}
// 6 тижнів з понеділка, що покривають місяць дати `focus`.
function monthGrid(focus: string) {
  const first = parse(focus);
  first.setUTCDate(1);
  const offset = (first.getUTCDay() + 6) % 7;
  const start = format(first);
  return Array.from({ length: 42 }, (_, i) => shiftDays(start, i - offset));
}

// Власний DatePicker (розділ 4.2): тригер як у Select, діалог «Choose a day» з сіткою днів (тиждень з понеділка),
// «сьогодні» (America/Los_Angeles, передає сервер) — тонке кільце, вибраний день — фон btn.
// Значення — <input type="hidden" name=…> у GET-формі /slots.
export function DatePicker({
  id,
  name,
  defaultValue,
  today,
}: {
  id: string;
  name: string;
  defaultValue: string;
  today: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();
  }, [open, focus]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (date: string) => {
    setValue(date);
    close();
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shiftDays(focus, -1),
      ArrowRight: () => shiftDays(focus, 1),
      ArrowUp: () => shiftDays(focus, -7),
      ArrowDown: () => shiftDays(focus, 7),
      PageUp: () => shiftMonths(focus, -1),
      PageDown: () => shiftMonths(focus, 1),
    };
    if (moves[event.key]) {
      event.preventDefault();
      setFocus(moves[event.key]());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(focus);
    }
  };

  const focusDate = parse(focus);
  const month = focusDate.getUTCMonth();
  const days = monthGrid(focus);
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <div ref={rootRef} className="relative w-full">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setFocus(value);
          setOpen((o) => !o);
        }}
        className={`${controlClass} cursor-pointer`}
      >
        <span className="flex-1 font-mono">{value}</span>
        <CalendarIcon className="size-4 flex-none text-muted" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Choose a day"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          className="absolute top-[calc(100%+6px)] left-0 z-10 w-[300px] max-w-[calc(100vw-32px)] rounded-md border border-border bg-surface p-3 shadow-pop"
        >
          <div className="mb-2 flex items-center justify-between font-semibold">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setFocus(shiftMonths(focus, -1))}
              className="grid size-11 cursor-pointer place-items-center rounded-md hover:bg-subtle"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span aria-live="polite">
              {MONTHS[month]} {focusDate.getUTCFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setFocus(shiftMonths(focus, 1))}
              className="grid size-11 cursor-pointer place-items-center rounded-md hover:bg-subtle"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
          <div ref={gridRef} role="grid" aria-label={`${MONTHS[month]} ${focusDate.getUTCFullYear()}`} onKeyDown={onGridKeyDown}>
            <div role="row" className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] leading-[14px] font-semibold text-muted">
              {WEEKDAYS.map((d) => (
                <span key={d} role="columnheader">
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((week) => (
              <div key={week[0]} role="row" className="grid grid-cols-7 gap-0.5">
                {week.map((date) => {
                  const outside = parse(date).getUTCMonth() !== month;
                  const isSelected = date === value;
                  const isToday = date === today;
                  return (
                    <span key={date} role="gridcell" aria-selected={isSelected}>
                      <button
                        type="button"
                        data-date={date}
                        tabIndex={date === focus ? 0 : -1}
                        aria-label={isToday ? `${date}, today` : date}
                        onClick={() => choose(date)}
                        className={`h-[38px] w-full cursor-pointer rounded-sm font-mono text-[13px] leading-none font-medium ${
                          isSelected ? "bg-btn text-on-btn" : "hover:bg-subtle"
                        } ${outside && !isSelected ? "text-muted opacity-50" : ""} ${
                          isToday && !isSelected ? "shadow-[inset_0_0_0_1px_var(--border-strong)]" : ""
                        }`}
                      >
                        {parse(date).getUTCDate()}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <Button variant="ghost" onClick={() => choose(today)}>
              Today
            </Button>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
