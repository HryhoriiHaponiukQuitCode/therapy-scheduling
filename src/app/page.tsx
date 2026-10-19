import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/roles";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { UserIcon } from "@/components/icons";

// Головна сторінка шаблону: хто увійшов і з якою роллю (з таблиці profiles).
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
// Меню й «Вийти» — у бічній панелі AppShell.
export default async function Home() {
  const supabase = await createClient();

  // getClaims() + власний профіль (RLS) — у getCurrentUser. getSession() для авторизації не використовуємо.
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user}>
      <Card id="team-project" title="Проєкт команди" icon={<UserIcon />} headingLevel={1}>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1">
            <dt className="font-semibold">Email</dt>
            <dd className="m-0 text-muted" data-testid="user-email">
              {user.email ?? "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-semibold">Роль</dt>
            <dd className="m-0 text-muted" data-testid="user-role">
              {user.role ?? "профіль не знайдено"}
            </dd>
          </div>
        </dl>
      </Card>
    </AppShell>
  );
}
