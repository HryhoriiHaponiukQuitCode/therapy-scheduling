import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { SlotsNavigation } from "@/components/slots-navigation";

// Каркас /slots: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»). Ліворуч панелі
// «Therapists» і «Day», праворуч панель дня (заголовок day-slots рендерить вміст). Скелетон передає вміст скелетонами.
export function SlotsShell({
  therapists,
  day,
  children,
}: {
  therapists: ReactNode;
  day: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader title="Slots" description="Times in America/Los_Angeles." />

      <SlotsNavigation className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="slots-therapists" title="Therapists" description="Choose whose slots to show side by side.">
            {therapists}
          </Panel>
          <Panel id="slots-day" title="Day">
            {day}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6 transition-opacity duration-200 group-data-[pending]/nav:opacity-60">
          <Panel labelledBy="day-slots">{children}</Panel>
        </div>
      </SlotsNavigation>
    </>
  );
}
