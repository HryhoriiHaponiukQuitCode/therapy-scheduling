import { AppShell } from "@/components/app-shell";
import { NoAccess } from "@/components/no-access";
import { getRequestUser } from "@/lib/request-user";

// Спільний каркас /, /clients, /slots, /my-schedule: бічна панель живе тут, тож між розділами вона не
// перемальовується і користувача не запитує знову, а loading.tsx розділу замінює лише контент.
// Вхід перевіряють proxy і сторінка (вона рендериться на кожен запит, layout — ні), тому без користувача
// layout просто віддає сторінку без каркаса, а редирект на /login робить вона.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getRequestUser();
  if (!user) return children;
  // Без ролі — лише повідомлення і «Sign out», без смуги й даних (AC-CARD-11). Сторінки перевіряють це ще раз:
  // layout не рендериться на кожну навігацію.
  if (user.role === null) return <NoAccess />;
  return <AppShell user={user}>{children}</AppShell>;
}
