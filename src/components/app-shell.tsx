import type { ReactNode } from "react";
import { getRequestTheme } from "@/lib/request-theme";
import { isStaff, type AppRole } from "@/lib/roles";
import type { Theme } from "@/lib/theme";
import { AccountMenu } from "./account-menu";
import { BrandMark } from "./brand-mark";
import { HoldsIcon, HomeIcon, ScheduleIcon, SlotsIcon, UsersIcon } from "./icons";
import { RailLink, RailThemeToggle } from "./rail-link";
import { ROUTE_STATUS_ID } from "./route-status-id";

type ShellUser = { email: string | null; role: AppRole | null };

// Бічна смуга (розділ 3): знак, круглі скляні кнопки пунктів за роллю, унизу перемикач теми. «Sign out» — у меню
// акаунта праворуч угорі (AccountMenu).
// До 760px — плаваюча скляна панель-пігулка внизу екрана, знак ховається.
export function Rail({ user, theme }: { user: ShellUser; theme: Theme }) {
  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-0 z-30 flex h-dvh flex-col items-center gap-3.5 pt-7 pb-6 max-[760px]:fixed max-[760px]:inset-x-3 max-[760px]:top-auto max-[760px]:bottom-3 max-[760px]:h-auto max-[760px]:flex-row max-[760px]:justify-around max-[760px]:gap-1 max-[760px]:rounded-full max-[760px]:border max-[760px]:border-card-border max-[760px]:bg-accent max-[760px]:p-2 max-[760px]:shadow-pop max-[760px]:backdrop-blur-[24px]"
    >
      <BrandMark className="mb-5 max-[760px]:hidden" />
      <nav aria-label="Main" className="flex flex-col items-center gap-3.5 max-[760px]:flex-1 max-[760px]:flex-row max-[760px]:justify-around max-[760px]:gap-1">
        <RailLink href="/" label="Home" icon={<HomeIcon />} />
        {/* Клієнти — усім ролям: терапевт бачить лише своїх (AC-CARD-04); слоти — лише admin і scheduler (AC-HOLD-44). */}
        {user.role ? <RailLink href="/clients" label="Clients" icon={<UsersIcon />} /> : null}
        {isStaff(user.role) ? <RailLink href="/slots" label="Slots" icon={<SlotsIcon />} /> : null}
        {isStaff(user.role) ? <RailLink href="/holds" label="Holds" icon={<HoldsIcon />} /> : null}
        {user.role === "therapist" ? <RailLink href="/my-schedule" label="My schedule" icon={<ScheduleIcon />} /> : null}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-3.5 max-[760px]:mt-0 max-[760px]:flex-row max-[760px]:gap-1">
        <RailThemeToggle initial={theme} />
      </div>
    </aside>
  );
}

// Каркас усіх сторінок, крім /login (розділ 3): сітка 96px | 1fr на тлі градієнта з плямами.
// Перший ряд контенту — PageHeader сторінки зліва і пігулка акаунта (меню з «Sign out») справа; решта дітей — на всю
// ширину.
export async function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const theme = await getRequestTheme();
  return (
    <div className="grid min-h-dvh w-full flex-1 grid-cols-[96px_minmax(0,1fr)] max-[760px]:grid-cols-1">
      <Rail user={user} theme={theme} />
      {/* Постійна live-область: loading.tsx пише в неї «Loading…» (LoadingStatus), тож скрінрідер оголошує перехід. */}
      <p id={ROUTE_STATUS_ID} role="status" className="sr-only" />
      <main className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start gap-6 pt-7 pr-8 pb-10 pl-2 max-[760px]:px-4 max-[760px]:pt-5 max-[760px]:pb-28 [&>*]:col-span-2">
        {children}
        <AccountMenu email={user.email} role={user.role} />
      </main>
    </div>
  );
}
