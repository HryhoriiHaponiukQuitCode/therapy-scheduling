// Скелетон (розділ 4): блок glass-hi з межею line, що пульсує, поки розділ вантажиться (loading.tsx).
// Пульс вимикається при prefers-reduced-motion (розділ 7). Скрінрідеру перехід оголошує LoadingStatus (route-status.tsx).
// Заокруглення за замовчуванням — пігулка; власне rounded-* у className його замінює (без конфлікту класів).
export function Skeleton({ className = "" }: { className?: string }) {
  const radius = /(^|\s)rounded-/.test(className) ? "" : "rounded-full";
  return (
    <span
      aria-hidden
      className={`block animate-pulse border border-line bg-glass-hi motion-reduce:animate-none ${radius} ${className}`}
    />
  );
}

// Поле форми: підпис і контрол-пігулка 48px, як у Field.
export function SkeletonField({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Skeleton className="h-[18px] w-20" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// Рядки списку з роздільником line: години сітки дня (DayGrid) і список клієнтів. columns — повні класи блоків
// (висота й ширина), без доданих тут розмірів, щоб не конфліктувати з класами виклику.
export function SkeletonRows({
  rows,
  columns,
  rowClassName = "min-h-14",
}: {
  rows: number;
  columns: string[];
  rowClassName?: string;
}) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={`flex items-center gap-4 border-t border-line py-2 first:border-t-0 ${rowClassName}`}>
          {columns.map((width, col) => (
            <Skeleton key={col} className={width} />
          ))}
        </div>
      ))}
    </div>
  );
}
