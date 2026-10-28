import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// Каркас списку утримань: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»).
export function HoldsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Holds" description="Held and expired holds of upcoming slots. Times in America/Los_Angeles." />
      <Panel id="holds-list" title="Upcoming holds" className="max-w-[880px]">
        {children}
      </Panel>
    </>
  );
}

// Рядок утримання: час, клієнт, терапевт, бейдж (і для «Held» — «Held until» та «Confirm»). Фактуру статусу
// (slot-held / slot-expired) додає сторінка; скелетон рядка — нейтральна рамка, бо статус ще невідомий.
export const HOLD_LIST = "m-0 flex list-none flex-col gap-2 p-0";
export const HOLD_ROW = "flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-lg px-3.5 py-3";

export function HoldRowSkeleton() {
  return (
    <div className={`${HOLD_ROW} min-h-[66px] border border-border`}>
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="ml-auto h-12 w-[104px]" />
    </div>
  );
}
