import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// Каркас головної: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»), тож скелетон
// не розходиться зі сторінкою. Статистика найближчих 7 днів (розділ 6b): плитки з числами, панель «Slots by day» і для
// адміністратора й планувальника — «By therapist». description: undefined — роль ще невідома (скелетон).
export function HomeShell({ description, children }: { description?: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title="Home" description={description ?? <Skeleton className="mt-1 h-5 w-[360px] max-w-full" />} />
      {children}
    </>
  );
}

// Плитки: чотири в ряд, дві до 1100px.
export function StatTiles({ children }: { children: ReactNode }) {
  return <dl className="m-0 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">{children}</dl>;
}

export function DaysPanel({ children }: { children: ReactNode }) {
  return (
    <Panel id="slots-by-day" title="Slots by day" description="Upcoming slots in the next 7 days, by status.">
      {children}
    </Panel>
  );
}

export function TherapistsPanel({ children }: { children: ReactNode }) {
  return (
    <Panel id="by-therapist" title="By therapist" description="Upcoming slots of each therapist in the next 7 days.">
      {children}
    </Panel>
  );
}
