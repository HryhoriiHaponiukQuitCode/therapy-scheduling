import type { ReactNode } from "react";
import type { BadgeStatus } from "./status-badge";
import { SlotCard } from "./slot-card";

export type DayGridSlot = {
  key: string;
  time: string; // «10:00»
  status: BadgeStatus;
  client: string | null;
  heldUntil: string | null; // уже відформатоване «Held until …»
  action?: ReactNode;
};

export type DayGridColumn = {
  key: string;
  header?: ReactNode; // шапка колонки (терапевт); без шапок — одна колонка без рядка заголовків
  message?: ReactNode; // повідомлення над слотами колонки (AC-HOLD-18, AC-HOLD-24)
  slots: DayGridSlot[];
};

const hourOf = (time: string) => Number(time.slice(0, 2));
const label = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

// Погодинна сітка дня (розділ 5): спільна шкала годин зліва (64px) і колонка на кожного терапевта (від 160px;
// ширші за панель — прокручуються в ній, сторінка — ні). Години — від найранішого до найпізнішого слота всіх
// колонок, у клітинці — SlotCard. Семантика — таблиця (role="table"): скрінрідер чує терапевта й годину клітинки.
// Кожен рядок — справжній бокс із subgrid (не display: contents, з яким старі Safari губили роль рядка).
// Лінія «зараз» (лише сьогодні) — 2px blue з точкою через усі колонки, під картками; час «HH:MM» — пігулка blue
// у колонці годин на рівні лінії. До першої години — по верхньому краю сітки, після останньої — по нижньому.
export function DayGrid({
  columns,
  now,
  label: tableLabel,
  "data-testid": testId,
}: {
  columns: DayGridColumn[];
  now?: { time: string; hour: number; minute: number } | null;
  label: string;
  "data-testid"?: string;
}) {
  const hours = columns.flatMap((column) => column.slots.map((slot) => hourOf(slot.time)));
  const first = Math.min(...hours);
  const last = Math.max(...hours);
  const range = hours.length > 0 ? Array.from({ length: last - first + 1 }, (_, i) => first + i) : [];

  const withHeader = columns.some((column) => column.header);
  const withMessages = columns.some((column) => column.message);

  let nowIndex = -1;
  let nowTop = 0;
  if (now && range.length > 0) {
    if (now.hour < first) {
      nowIndex = 0;
    } else if (now.hour > last) {
      nowIndex = range.length - 1;
      nowTop = 100;
    } else {
      nowIndex = now.hour - first;
      nowTop = Math.round((now.minute / 60) * 100);
    }
  }

  const row = "relative col-span-full grid grid-cols-subgrid";
  const cell = "relative z-[1] min-w-0 border-line";
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        role="table"
        aria-label={tableLabel}
        data-testid={testId}
        className="grid min-w-fit"
        style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(160px, 1fr))` }}
      >
        {withHeader ? (
          <div role="row" className={row}>
            <span role="columnheader" className={`${cell} border-b`}>
              <span className="sr-only">Time</span>
            </span>
            {columns.map((column) => (
              <div key={column.key} role="columnheader" className={`${cell} border-b border-l px-3 py-3 text-left`}>
                {column.header}
              </div>
            ))}
          </div>
        ) : null}

        {withMessages ? (
          <div role="row" className={row}>
            <span role="rowheader" className={cell}>
              <span className="sr-only">Day</span>
            </span>
            {columns.map((column) => (
              <div key={column.key} role="cell" className={`${cell} border-l p-1.5`}>
                {column.message}
              </div>
            ))}
          </div>
        ) : null}

        {range.map((hour, index) => (
          <div key={hour} role="row" className={row}>
            <span role="rowheader" className={`${cell} border-t pt-2.5 text-sm font-medium text-muted`}>
              {label(hour)}
            </span>
            {columns.map((column) => {
              const slot = column.slots.find((s) => hourOf(s.time) === hour);
              return (
                <div key={column.key} role="cell" className={`${cell} min-h-[124px] border-t border-l p-1.5`}>
                  {slot ? (
                    <SlotCard
                      status={slot.status}
                      name={slot.client ?? undefined}
                      detail={slot.heldUntil ?? undefined}
                      range={`${slot.time} – ${label(hour + 1)}`}
                      action={slot.action}
                    />
                  ) : null}
                </div>
              );
            })}
            {index === nowIndex && now ? (
              // Без z-index у самого шару: лінія (z-0) лягає під клітинки (z-[1]), пігулка (z-[2]) — над підписами годин.
              <div aria-hidden className="pointer-events-none absolute inset-x-0 h-0.5" style={{ top: `${nowTop}%` }}>
                <span className="absolute right-0 left-16 z-0 h-0.5 bg-blue opacity-90" />
                <span className="absolute -top-1 left-16 z-0 -ml-[5px] size-2.5 rounded-full bg-blue shadow-[0_0_0_4px_color-mix(in_srgb,var(--blue)_18%,transparent)]" />
                {/* Пігулка часу — у колонці годин (ширина < 64px), поверх підписів годин: не залазить у колонки. */}
                <span className="absolute top-1/2 left-1 z-[2] -translate-y-1/2 rounded-full bg-blue px-1.5 py-0.5 text-[11px] leading-[14px] font-bold text-on-navy">
                  {now.time}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
