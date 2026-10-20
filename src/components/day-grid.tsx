import type { ReactNode } from "react";
import type { BadgeStatus } from "./status-badge";
import { SlotCard } from "./slot-card";

export type DayGridRow = {
  key: string;
  time: string; // «10:00»
  status: BadgeStatus;
  client: string | null;
  heldUntil: string | null; // уже відформатоване «Held until …»
  action?: ReactNode;
};

// Погодинна сітка дня (розділ 5): рядок на кожну годину — година muted 500 у колонці 64px (52px на телефоні),
// роздільник line, у рядку SlotCard. Лінія «зараз» (лише для сьогоднішнього дня) — 2px blue з точкою і пігулкою
// «Now HH:MM» у рядку поточної години; проходить під картками, aria-hidden.
export function DayGrid({
  rows,
  now,
  "data-testid": testId,
}: {
  rows: DayGridRow[];
  now?: { time: string; hour: string; minute: number } | null;
  "data-testid"?: string;
}) {
  return (
    <div className="relative mt-2" data-testid={testId}>
      {rows.map((row) => {
        const showNow = now && row.time.slice(0, 2) === now.hour;
        return (
          <div
            key={row.key}
            className="relative grid min-h-[104px] grid-cols-[64px_minmax(0,1fr)] border-t border-line last:border-b max-[760px]:grid-cols-[52px_minmax(0,1fr)]"
          >
            <span className="pt-2.5 font-medium text-muted">{row.time}</span>
            {showNow ? (
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 left-14 z-0 h-0.5 bg-blue opacity-90 max-[760px]:left-11"
                style={{ top: `${Math.round((now.minute / 60) * 100)}%` }}
              >
                <span className="absolute -top-1 -left-[5px] size-2.5 rounded-full bg-blue shadow-[0_0_0_4px_color-mix(in_srgb,var(--blue)_18%,transparent)]" />
                <span className="absolute top-2 -left-14 rounded-full bg-glass-hi px-2 py-0.5 text-[11px] leading-[14px] font-bold text-blue max-[760px]:-left-11">
                  Now {now.time}
                </span>
              </div>
            ) : null}
            <div className="relative z-[1] py-2 pl-2">
              <SlotCard
                status={row.status}
                name={row.client ?? undefined}
                detail={row.heldUntil ?? undefined}
                action={row.action}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
