import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/request-user";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";

// Головна сторінка шаблону: хто увійшов і з якою роллю (з таблиці profiles).
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
// Меню й «Sign out» — у смузі AppShell (src/app/(app)/layout.tsx).
export default async function Home() {
  // getClaims() + власний профіль (RLS) — у getCurrentUser (через getRequestUser: той самий виклик, що в layout).
  // getSession() для авторизації не використовуємо.
  const user = await getRequestUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader title="Home" description="Practice scheduling" />
      <Panel id="account" title="Account">
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-semibold text-muted-foreground">Email</dt>
            <dd className="m-0 font-semibold break-all" data-testid="user-email">
              {user.email ?? "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-semibold text-muted-foreground">Role</dt>
            <dd className="m-0 font-semibold" data-testid="user-role">
              {user.role ?? "profile not found"}
            </dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}
