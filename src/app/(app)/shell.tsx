import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

// Каркас головної: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»), тож скелетон
// не розходиться зі сторінкою. Пари «підпис / значення» — ACCOUNT_GRID.
export const ACCOUNT_GRID = "m-0 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-12 gap-y-6";

export function HomeShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Home" description="Practice scheduling" />
      <Panel id="account" title="Account">
        {children}
      </Panel>
    </>
  );
}
