"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

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
// Тижні з понеділка, що покривають місяць дати `focus`.
function monthGrid(focus: string) {
  const first = parse(focus);
  first.setUTCDate(1);
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const start = format(first);
  return Array.from({ length: weeks * 7 }, (_, i) => shiftDays(start, i - offset));
}

// Вбудований календар дня (розділ 4.2): кожен день — submit-кнопка GET-форми name={name}, тож вибір одразу
// відправляє форму й без JavaScript. Кнопки місяця лише перемикають вигляд. Вибраний день — коло primary,
// «сьогодні» (America/Los_Angeles, передає сервер) — крапка now. Клавіатура: roving tabindex, стрілки по днях,
// PageUp / PageDown — місяць; кнопка «Today» вибирає сьогоднішній день.
export function Calendar({ name, value, today }: { name: string; value: string; today: string }) {
  const [focus, setFocus] = useState(value);
  // Новий вибраний день із сервера — показуємо його місяць. Без перемонтування (key), щоб кнопка дня, яку
  // натиснули, зберегла фокус після переходу.
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    setFocus(value);
  }
  const gridRef = useRef<HTMLDivElement>(null);

  // День вибрали в сітці (клік чи Enter) — після переходу фокусуємо вибраний день: якщо це день іншого місяця,
  // сітка перебудувалась і натиснута кнопка зникла, тож без цього фокус упав би на body.
  const pickedInGrid = useRef(false);
  useEffect(() => {
    if (!pickedInGrid.current) return;
    pickedInGrid.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)?.focus();
  }, [value]);
  const days = monthGrid(focus);
  const month = parse(focus).getUTCMonth();
  const title = `${MONTHS[month]} ${parse(focus).getUTCFullYear()}`;

  // Фокус переносимо після рендеру нового місяця (клавіатура), а не на кожну зміну focus (кнопки місяця).
  const focusAfterRender = useRef(false);
  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();
  }, [focus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = (event.target as HTMLElement).dataset.date ?? focus;
    const step: Record<string, () => string> = {
      ArrowLeft: () => shiftDays(from, -1),
      ArrowRight: () => shiftDays(from, 1),
      ArrowUp: () => shiftDays(from, -7),
      ArrowDown: () => shiftDays(from, 7),
      PageUp: () => shiftMonths(from, -1),
      PageDown: () => shiftMonths(from, 1),
    };
    const next = step[event.key];
    if (!next) return;
    event.preventDefault();
    focusAfterRender.current = true;
    setFocus(next());
  };

  const iconButton =
    "grid size-11 cursor-pointer place-items-center rounded-full border border-card-border bg-card text-foreground hover:bg-accent [&>svg]:size-4";

  return (
    <div>
      <div className="mt-1 mb-2 flex items-center justify-between">
        <button type="button" className={iconButton} aria-label="Previous month" onClick={() => setFocus(shiftMonths(focus, -1))}>
          <ChevronLeftIcon />
        </button>
        <b className="text-[15px] leading-5 font-semibold" aria-live="polite">
          {title}
        </b>
        <button type="button" className={iconButton} aria-label="Next month" onClick={() => setFocus(shiftMonths(focus, 1))}>
          <ChevronRightIcon />
        </button>
      </div>
      <div ref={gridRef} role="grid" aria-label={title} onKeyDown={onKeyDown}>
        <div role="row" className="mb-1 grid grid-cols-[repeat(7,minmax(0,1fr))] text-center">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className="text-[11px] leading-[14px] font-semibold text-muted-foreground">
              {d}
            </span>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, week) => (
          <div key={week} role="row" className="mb-0.5 grid grid-cols-[repeat(7,minmax(0,1fr))]">
            {days.slice(week * 7, week * 7 + 7).map((day) => {
              const selected = day === value;
              const isToday = day === today;
              const outside = parse(day).getUTCMonth() !== month;
              return (
                <span key={day} role="gridcell" className="flex justify-center">
                  <button
                    type="submit"
                    name={name}
                    value={day}
                    data-date={day}
                    tabIndex={day === focus ? 0 : -1}
                    aria-pressed={selected}
                    aria-label={isToday ? `${day}, today` : day}
                    // День іншого місяця не перемикає вигляд на фокусі: інакше mousedown перебудує сітку
                    // до кліку і під курсором опиниться інша кнопка.
                    onFocus={outside ? undefined : () => setFocus(day)}
                    onClick={() => {
                      pickedInGrid.current = day !== value;
                    }}
                    className={`relative aspect-square w-full max-w-11 cursor-pointer rounded-full border-0 text-[13px] leading-none ${
                      selected ? "bg-primary font-bold text-primary-foreground" : "bg-transparent font-medium text-foreground hover:bg-accent"
                    } ${outside && !selected ? "text-muted-foreground opacity-50" : ""}`}
                  >
                    {Number(day.slice(8))}
                    {isToday ? (
                      <span
                        aria-hidden
                        className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${selected ? "bg-primary-foreground" : "bg-now"}`}
                      />
                    ) : null}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {/* «Today» — та сама submit-кнопка форми, що й дні: повертає до сьогодні після гортання місяців. */}
      <div className="mt-2 flex justify-center">
        <button
          type="submit"
          name={name}
          value={today}
          className="min-h-11 cursor-pointer rounded-full border border-card-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          Today
        </button>
      </div>
    </div>
  );
}
