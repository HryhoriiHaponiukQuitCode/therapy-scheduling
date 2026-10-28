import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

// Каркас нової картки клієнта: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»).
export function NewClientShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="New client" description="Client card from an intake form." />
      <Panel
        id="client-card"
        title="Client card"
        actions={
          <Link href="/clients" className={buttonClass("glass")}>
            All clients
          </Link>
        }
        className="max-w-[560px]"
      >
        {children}
      </Panel>
    </>
  );
}
