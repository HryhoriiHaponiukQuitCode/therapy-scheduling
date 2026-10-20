import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { getRequestUser, isStaff, type AppRole } from "@/lib/roles";
import { Button } from "./button";
import { BrandMark, HomeIcon, ScheduleIcon, SlotsIcon, UsersIcon } from "./icons";
import { NavLink } from "./nav-link";

type ShellUser = { email: string | null; role: AppRole | null };

// Бічна панель (розділ 3): знак і назва, меню за роллю, блок акаунта з наявною формою signOut.
// До 860px панель стає верхнім рядком: знак і «Вийти» в першому рядку, меню — рядком нижче.
export function Sidebar({ user }: { user: ShellUser }) {
  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-0 flex h-dvh flex-col gap-6 border-r border-border bg-surface px-3 pt-5 pb-4 max-[860px]:static max-[860px]:h-auto max-[860px]:flex-row max-[860px]:flex-wrap max-[860px]:items-center max-[860px]:gap-2 max-[860px]:border-r-0 max-[860px]:border-b max-[860px]:py-2.5"
    >
      <div className="flex items-center gap-2.5 px-2.5 py-1 text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap">
        <BrandMark />
        Practice scheduling
      </div>
      <nav
        aria-label="Main"
        className="flex flex-col gap-0.5 max-[860px]:order-3 max-[860px]:basis-full max-[860px]:flex-row max-[860px]:overflow-x-auto"
      >
        <div className="px-2.5 pb-2 text-[11px] leading-[14px] font-semibold tracking-[0.08em] text-muted uppercase max-[860px]:hidden">
          Menu
        </div>
        <NavLink href="/" icon={<HomeIcon />}>
          Home
        </NavLink>
        {isStaff(user.role) ? (
          <>
            <NavLink href="/clients" icon={<UsersIcon />}>
              Clients
            </NavLink>
            <NavLink href="/slots" icon={<SlotsIcon />}>
              Slots
            </NavLink>
          </>
        ) : null}
        {user.role === "therapist" ? (
          <NavLink href="/my-schedule" icon={<ScheduleIcon />}>
            My schedule
          </NavLink>
        ) : null}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-border px-2.5 pt-4 max-[860px]:mt-0 max-[860px]:ml-auto max-[860px]:flex-row max-[860px]:items-center max-[860px]:border-t-0 max-[860px]:p-0">
        <div className="flex min-w-0 items-center gap-2.5 max-[860px]:hidden">
          <span
            aria-hidden
            className="grid size-9 flex-none place-items-center rounded-full border border-border bg-subtle text-xs leading-none font-semibold"
          >
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium">{user.email ?? "—"}</span>
            <span className="text-xs text-muted">{user.role ?? "—"}</span>
          </span>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full max-[860px]:w-auto">
            Вийти
          </Button>
        </form>
      </div>
    </aside>
  );
}

// Каркас усіх сторінок, крім /login: сітка 248px | 1fr, контент до 960px з padding 40px (16px на телефоні).
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh w-full flex-1 grid-cols-[248px_minmax(0,1fr)] bg-page max-[860px]:grid-cols-1">
      <Sidebar user={user} />
      <main className="flex w-full max-w-[960px] min-w-0 flex-col gap-6 px-10 pt-10 pb-12 max-[720px]:px-4 max-[720px]:pt-6 max-[720px]:pb-8">
        {children}
      </main>
    </div>
  );
}

// AppShell для layout розділу (/clients, /slots, /my-schedule): меню лишається на місці, поки loading.tsx
// розділу показує скелетон контенту. Користувач — той самий, що й у сторінки (getRequestUser, React cache).
export async function SignedInShell({ children }: { children: ReactNode }) {
  const user = await getRequestUser();
  if (!user) {
    redirect("/login");
  }
  return <AppShell user={user}>{children}</AppShell>;
}
