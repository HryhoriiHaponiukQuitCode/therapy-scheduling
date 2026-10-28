import type { ReactNode } from "react";
import { weekdayName } from "@/lib/slots";
import { bookedPercent, totalSlots, type DayStats, type StatusCounts } from "@/lib/stats";
import { ChevronDownIcon } from "./icons";

// Статистика головної (DESIGN.md, розділ 6b «Статистика»): плитки з числами, стовпці «слоти за днями» і таблиці.
// Без клієнтського JS: підказка стовпця — CSS (hover і фокус), таблиця — <details>.
// Порядок у стовпці знизу вгору й у легенді: Confirmed, Held, Free. Заливки — токени chart-*; Free — без заливки,
// пунктир input, як картка Free (SlotCard): вільний запас, а не ще одна серія. Статус ніколи не лише кольором:
// легенда й таблиця підписують кожен колір текстом.
const SERIES = [
  { key: "confirmed", label: "Confirmed", mark: "bg-chart-confirmed" },
  { key: "held", label: "Held", mark: "bg-chart-held" },
  { key: "free", label: "Free", mark: "border-[1.5px] border-dashed border-input" },
] as const;

function Swatch({ mark }: { mark: string }) {
  return <span aria-hidden className={`size-3 flex-none rounded-[3px] ${mark}`} />;
}

export function ChartLegend() {
  return (
    <ul aria-label="Legend" className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm text-muted-foreground">
      {SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-2">
          <Swatch mark={series.mark} />
          {series.label}
        </li>
      ))}
    </ul>
  );
}

// Сегменти зі зазором 2px (gap батька); заокруглений 4px лише кінець даних: верх стовпця, правий край смуги.
// Порожні сегменти не малюємо. flexGrow — частка сегмента, не колір.
function Segments({ counts, vertical }: { counts: StatusCounts; vertical: boolean }) {
  return SERIES.filter((series) => counts[series.key] > 0).map((series) => (
    <span
      key={series.key}
      className={`${series.mark} ${vertical ? "min-h-[3px] last:rounded-t-[4px]" : "min-w-[3px] last:rounded-r-[4px]"}`}
      style={{ flexGrow: counts[series.key], flexBasis: 0 }}
    />
  ));
}

function percentText(counts: StatusCounts): string {
  const percent = bookedPercent(counts);
  return percent === null ? "No slots" : `${percent}%`;
}

// Опис дня для скрінрідера й підказки: «3 confirmed, 1 held, 8 free».
function countsText(counts: StatusCounts): string {
  return SERIES.map((series) => `${counts[series.key]} ${series.label.toLowerCase()}`).join(", ");
}

// Стовпці «слоти за днями»: висота — усі ще не початі слоти дня, сегменти — статуси. Над стовпцем — підсумок дня,
// під ним — день тижня й число (повна дата YYYY-MM-DD — у підказці й таблиці). Кожен день — у фокусі з клавіатури:
// на hover і focus — підказка з усіма статусами (aria-hidden: те саме читає aria-label дня). Тло підказки непрозоре
// (background): напівпрозоре popover у темній темі пропускає текст заголовка панелі під нею.
export function DayChart({ days, today }: { days: DayStats[]; today: string }) {
  const max = Math.max(1, ...days.map(totalSlots));
  return (
    <div className="flex flex-col gap-4">
      <ChartLegend />
      <ol aria-label="Upcoming slots by day" className="m-0 grid list-none grid-cols-7 gap-1 p-0">
        {days.map((day, index) => {
          const total = totalSlots(day);
          const align = index < 2 ? "left-0" : index > days.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <li
              key={day.date}
              tabIndex={0}
              aria-label={`${weekdayName(day.date)}, ${day.date}: ${countsText(day)}`}
              data-testid="chart-day"
              className="group relative flex flex-col items-center gap-2 rounded-md pt-7 pb-2 hover:bg-accent focus-visible:bg-accent"
            >
              <div aria-hidden className="flex h-40 w-full items-end justify-center border-b border-border">
                <div
                  className="relative flex w-6 flex-col-reverse gap-[2px]"
                  style={{ height: `${(total / max) * 100}%` }}
                >
                  <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold">
                    {total}
                  </span>
                  <Segments counts={day} vertical />
                </div>
              </div>
              <span aria-hidden className="flex flex-col items-center text-xs leading-4">
                <span className="font-semibold">
                  {day.date === today ? "Today" : weekdayName(day.date).slice(0, 3)}
                </span>
                <span className="text-muted-foreground">{day.date.slice(8)}</span>
              </span>
              <div
                aria-hidden
                className={`pointer-events-none invisible absolute bottom-full z-20 mb-1 w-max min-w-[168px] rounded-md border border-card-border bg-background p-3 text-sm opacity-0 shadow-pop transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 motion-reduce:transition-none ${align}`}
              >
                <p className="m-0 mb-2 text-xs font-semibold text-muted-foreground">
                  {weekdayName(day.date)}, {day.date}
                </p>
                <CountsList counts={day} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Значення попереду, підпис зі зразком кольору — за ним (підказка стовпця).
function CountsList({ counts }: { counts: StatusCounts }) {
  const rows = [
    ...SERIES.map((series) => ({
      key: series.key,
      value: String(counts[series.key]),
      label: series.label,
      mark: series.mark,
    })),
    { key: "booked", value: percentText(counts), label: "Booked", mark: null },
  ];
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <span className="text-right font-semibold">{row.value}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {row.mark ? <Swatch mark={row.mark} /> : null}
            {row.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Плитка з числом (dataviz: label · value · caption): підпис з іконкою статусу, значення 34/40 600, пояснення muted.
export function StatTile({
  icon,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  caption: ReactNode;
}) {
  return (
    <div className="glass flex min-w-0 flex-col gap-1 rounded-lg p-5">
      <dt className="flex items-center gap-2 text-[13px] leading-[18px] font-semibold text-muted-foreground [&>svg]:size-4">
        {icon}
        {label}
      </dt>
      <dd className="m-0 text-[34px] leading-10 font-semibold tracking-[-0.02em]">{value}</dd>
      <dd className="m-0 text-xs text-muted-foreground">{caption}</dd>
    </div>
  );
}

// Таблиця чисел (табличне подання графіка й розбивка за терапевтами). meter — у колонці «Booked» тонка смуга зі
// статусами: та сама кодування, що в стовпцях, лише горизонтально.
export function CountsTable({
  caption,
  head,
  rows,
  total,
  meter = false,
}: {
  caption: string;
  head: string;
  rows: { key: string; label: ReactNode; counts: StatusCounts }[];
  total?: StatusCounts;
  meter?: boolean;
}) {
  const th = "border-b border-border py-2 pr-3 text-[13px] font-semibold text-muted-foreground last:pr-0";
  const td = "border-b border-border py-2.5 pr-3 last:pr-0";
  const row = (label: ReactNode, counts: StatusCounts, strong = false) => (
    <>
      <th scope="row" className={`${td} text-left ${strong ? "font-semibold" : "font-normal"}`}>
        {label}
      </th>
      {SERIES.map((series) => (
        <td key={series.key} className={`${td} text-right ${strong ? "font-semibold" : ""}`}>
          {counts[series.key]}
        </td>
      ))}
      <td className={`${td} ${strong ? "font-semibold" : ""}`}>
        <span className="flex items-center justify-end gap-3">
          {meter && totalSlots(counts) > 0 ? (
            <span aria-hidden className="flex h-2 w-24 gap-[2px] max-[760px]:hidden">
              <Segments counts={counts} vertical={false} />
            </span>
          ) : null}
          <span className="min-w-12 text-right">{percentText(counts)}</span>
        </span>
      </td>
    </>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${th} text-left`}>
              {head}
            </th>
            {SERIES.map((series) => (
              <th key={series.key} scope="col" className={`${th} text-right`}>
                {series.label}
              </th>
            ))}
            <th scope="col" className={`${th} text-right`}>
              Booked
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>{row(r.label, r.counts)}</tr>
          ))}
        </tbody>
        {total ? (
          <tfoot>
            <tr>{row("Total", total, true)}</tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

// Табличне подання графіка — згорнуте під ним (<details>: з клавіатури, без JS).
export function TableView({ children }: { children: ReactNode }) {
  return (
    <details className="group/table mt-2">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        Show as table
        <ChevronDownIcon className="size-4 transition-transform group-open/table:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
