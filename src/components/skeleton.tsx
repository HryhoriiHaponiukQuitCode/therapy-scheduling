// Скелетон (розділ 4): блок кольору border, що пульсує, поки розділ вантажиться (loading.tsx).
// Пульс вимикається при prefers-reduced-motion (розділ 7). Скрінрідеру перехід оголошує LoadingStatus (route-status.tsx).
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-border motion-reduce:animate-none ${className}`} />;
}

// Поле форми: підпис і контрол 44px, як у Field.
export function SkeletonField({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Skeleton className="h-[18px] w-20" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

// Рядки таблиці 60px з роздільником border, як у SlotTable і таблиці клієнтів.
export function SkeletonRows({ rows, columns }: { rows: number; columns: string[] }) {
  return (
    <div aria-hidden className="flex flex-col [&>div:last-child]:border-b-0">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex min-h-[60px] items-center gap-4 border-b border-border px-3">
          {columns.map((width, col) => (
            <Skeleton key={col} className={`h-4 ${width}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
