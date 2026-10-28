import { getPageAccess } from "@/lib/request-user";
import { APP_ROLES, NO_ROLE_MESSAGE } from "@/lib/roles";
import { NoAccess } from "@/components/no-access";
import { ACCOUNT_GRID, HomeShell } from "./shell";

// Головна сторінка шаблону: хто увійшов і з якою роллю (з таблиці profiles).
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
// Меню — у смузі AppShell, «Sign out» — у меню акаунта праворуч угорі (src/app/(app)/layout.tsx).
export default async function Home() {
  // getClaims() + власний профіль (RLS) — у getCurrentUser (через getRequestUser: той самий виклик, що в layout).
  // getSession() для авторизації не використовуємо.
  // Будь-яка роль застосунку (APP_ROLES, тож гілки forbidden тут немає); без ролі — лише NoAccess (AC-CARD-11).
  const access = await getPageAccess(APP_ROLES, NO_ROLE_MESSAGE);
  if (access.kind !== "ok") return <NoAccess />;
  const user = access.user;

  return (
    <HomeShell>
      <dl className={ACCOUNT_GRID}>
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] font-semibold text-muted-foreground">Email</dt>
          <dd className="m-0 font-semibold break-all" data-testid="user-email">
            {user.email ?? "Not set"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] font-semibold text-muted-foreground">Role</dt>
          <dd className="m-0 font-semibold" data-testid="user-role">
            {user.role ?? "profile not found"}
          </dd>
        </div>
      </dl>
    </HomeShell>
  );
}
