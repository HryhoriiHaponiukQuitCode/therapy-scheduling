import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// Каркас картки клієнта: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»).
// name: undefined — картка ще вантажиться (ім'я — скелетоном). Пари «поле / значення» — CARD_GRID.
export const CARD_GRID = "m-0 grid grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-x-6 gap-y-4";

export function ClientCardShell({ name, children }: { name?: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={name ?? <Skeleton className="my-2 h-9 w-64" />} description="Client card" />
      <Panel
        id="client-card"
        title="Intake form"
        actions={
          <Link href="/clients" className={buttonClass("glass")}>
            All clients
          </Link>
        }
        className="max-w-[640px]"
      >
        {children}
      </Panel>
    </>
  );
}
