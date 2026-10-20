"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Пункт меню бічної панелі: 44px, радіус 8px; активний — фон subtle, ink, 600 і aria-current="page" (розділ 3).
export function NavLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-none items-center gap-2.5 rounded-md px-2.5 font-medium whitespace-nowrap no-underline hover:bg-subtle hover:text-ink [&>svg]:size-[18px] [&>svg]:flex-none ${
        active ? "bg-subtle font-semibold text-ink" : "text-muted"
      }`}
    >
      <NavIcon icon={icon} />
      {children}
    </Link>
  );
}

// Поки перехід на цей пункт чекає сервера (useLinkStatus) — спінер замість іконки, того ж розміру 18px: без зсуву
// макета. Якщо loading.tsx розділу вже завантажено наперед, Next пропускає pending і одразу показує скелетон.
function NavIcon({ icon }: { icon: ReactNode }) {
  const { pending } = useLinkStatus();
  if (!pending) return icon;
  return (
    <span
      aria-hidden
      className="size-[18px] flex-none animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}
