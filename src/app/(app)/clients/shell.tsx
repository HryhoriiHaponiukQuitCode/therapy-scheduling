import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// Каркас списку клієнтів: спільний для page.tsx і loading.tsx (DESIGN.md, розділ 6, «Завантаження розділу»).
// staff: undefined — роль ще невідома (скелетон): назва панелі й кнопка — скелетонами, бо для терапевта вони інші.
export function ClientsShell({ staff, children }: { staff?: boolean; children: ReactNode }) {
  return (
    <>
      <PageHeader title="Clients" description={staff === false ? "Clients you have holds or sessions with." : undefined} />
      <Panel
        id="all-clients"
        title={staff === undefined ? <Skeleton className="h-7 w-32" /> : staff ? "All clients" : "My clients"}
        actions={
          staff === undefined ? (
            <Skeleton className="h-12 w-[130px]" />
          ) : staff ? (
            <Link href="/clients/new" className={buttonClass("primary")}>
              New client
            </Link>
          ) : null
        }
      >
        {children}
      </Panel>
    </>
  );
}

// Рядок списку: аватар, ім'я й другий рядок (email або опікун). Той самий вигляд у сторінки й у скелетона.
export const CLIENT_LIST = "m-0 flex list-none flex-col p-0";
export const CLIENT_ITEM = "border-t border-border first:border-t-0";
export const CLIENT_ROW = "flex min-h-14 items-center gap-3 rounded-md px-2 py-2";

export function ClientRowSkeleton() {
  return (
    <div className={CLIENT_ROW}>
      <Skeleton className="size-10 flex-none" />
      <span className="flex min-w-0 flex-col gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-52" />
      </span>
    </div>
  );
}
