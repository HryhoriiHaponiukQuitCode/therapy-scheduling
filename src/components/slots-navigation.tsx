"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent, type ReactNode } from "react";
import { useLoadingAnnouncement } from "./route-status";

// Обгортка /slots: GET-форми вибору терапевта й дня (data-navigate) відправляються без перезавантаження —
// router.push у transition, тож поточна сторінка лишається, а розклад праворуч тьмяніє, поки вантажиться новий день.
// next/form тут не підходить: він не передає name/value натиснутої кнопки. Без JavaScript форми працюють як звичайні GET.
export function SlotsNavigation({ className = "", children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useLoadingAnnouncement(pending);

  const onSubmit = (event: FormEvent<HTMLDivElement>) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.navigate === undefined) return;
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(form, submitter instanceof HTMLButtonElement ? submitter : null);
    const params = new URLSearchParams();
    // append: кілька терапевтів — повторюваний параметр therapist (?therapist=a&therapist=b).
    data.forEach((value, key) => params.append(key, String(value)));
    // Адреса — з атрибута action самої форми, як і без JavaScript.
    const action = form.getAttribute("action") ?? window.location.pathname;
    startTransition(() => router.push(`${action}?${params}`));
  };

  return (
    <div onSubmit={onSubmit} data-pending={pending || undefined} aria-busy={pending || undefined} className={`group/nav ${className}`}>
      {children}
    </div>
  );
}
