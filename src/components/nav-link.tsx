"use client";

import Link from "next/link";
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
      {icon}
      {children}
    </Link>
  );
}
