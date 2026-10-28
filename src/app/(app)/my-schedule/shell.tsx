import type { ReactNode } from "react";
import { weekdayName } from "@/lib/slots";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// Каркас розкладу терапевта: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»).
// week: undefined — тиждень ще невідомий (скелетон): діапазон в описі й кнопки тижнів — скелетонами.
export function MyScheduleShell({
  week,
  weekNav,
  children,
}: {
  week?: { start: string; end: string };
  weekNav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="My schedule"
        description={
          week ? (
            `Week ${week.start} – ${week.end}, times in America/Los_Angeles.`
          ) : (
            <Skeleton className="mt-1 h-5 w-[420px] max-w-full" />
          )
        }
      />
      <nav aria-label="Weeks" className="flex flex-wrap gap-2">
        {weekNav ??
          ["w-[150px]", "w-[118px]", "w-[124px]"].map((width) => <Skeleton key={width} className={`h-12 ${width}`} />)}
      </nav>
      {children}
    </>
  );
}

// Панель дня тижня. date: undefined — день ще невідомий (скелетон заголовка).
export function DayPanel({ date, today, children }: { date?: string; today?: boolean; children: ReactNode }) {
  return (
    <Panel
      id={date ? `day-${date}` : undefined}
      title={date ? `${weekdayName(date)}, ${date}${today ? ", today" : ""}` : <Skeleton className="h-7 w-56" />}
    >
      {children}
    </Panel>
  );
}
