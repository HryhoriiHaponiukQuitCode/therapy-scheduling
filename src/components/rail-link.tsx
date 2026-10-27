"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { THEME_COOKIE, THEME_MAX_AGE, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";
import { useLoadingAnnouncement } from "./route-status";

// Кругла скляна кнопка смуги (розділ 3): 56px, активна — 64px, фон primary. Назва — aria-label і видима
// підказка-пігулка праворуч на hover і focus; до 760px смуга — плаваюча панель внизу, кнопки 52px без підказок.
const railButton =
  "group relative grid size-14 flex-none cursor-pointer place-items-center rounded-full border border-card-border bg-card text-foreground no-underline shadow-glass transition-[background-color,width,height] duration-150 hover:bg-accent focus-visible:outline-offset-3 [&_svg]:size-[22px] max-[760px]:size-[52px] max-[760px]:shadow-none";
const activeButton =
  "size-16 border-transparent bg-primary text-primary-foreground shadow-primary hover:bg-primary max-[760px]:size-[52px]";

function Tip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-20 -translate-y-1/2 rounded-lg bg-primary px-2.5 py-2 text-xs leading-none font-semibold whitespace-nowrap text-primary-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 max-[760px]:hidden"
    >
      {children}
    </span>
  );
}

export function RailLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`${railButton} ${active ? activeButton : ""}`}
    >
      <RailIcon icon={icon} />
      <Tip>{label}</Tip>
    </Link>
  );
}

// Поки перехід на цей пункт чекає сервера (useLinkStatus) — спінер замість іконки, того ж розміру: без зсуву
// макета. Якщо loading.tsx розділу вже завантажено наперед, Next пропускає pending і одразу показує скелетон.
// Спінер лише візуальний (aria-hidden); скрінрідеру очікування оголошує live-область AppShell.
function RailIcon({ icon }: { icon: ReactNode }) {
  const { pending } = useLinkStatus();
  useLoadingAnnouncement(pending);
  if (!pending) return icon;
  return <Spinner />;
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-[22px] animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}

// Перемикач темної теми над «Sign out»: role="switch" з aria-checked, назва «Dark theme» — однакова в aria-label
// і видимій підказці (WCAG 2.5.3), стан — лише в aria-checked і іконці.
// Тема міняється одразу (клас .dark на <html>) і запамʼятовується в cookie на рік: наступні сторінки сервер
// віддає вже в ній. initial — тема цього запиту з cookie (за замовчуванням світла).
export function RailThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState(initial);
  const dark = theme === "dark";
  const toggle = () => {
    const next: Theme = dark ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
  };
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Dark theme" onClick={toggle} className={railButton}>
      {dark ? <SunIcon /> : <MoonIcon />}
      <Tip>Dark theme</Tip>
    </button>
  );
}

// «Sign out» у смузі — кругла кнопка наявної форми signOut; на час дії — спінер, aria-busy і disabled.
export function RailSignOut({ label, icon }: { label: string; icon: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${railButton} disabled:cursor-progress`}
    >
      {pending ? <Spinner /> : icon}
      <Tip>{label}</Tip>
    </button>
  );
}
