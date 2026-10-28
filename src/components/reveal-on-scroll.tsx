"use client";

import { useEffect } from "react";

// Поява блоків лендінгу, коли до них доходить прокрутка (як у прикладі Vitalis): елемент з data-reveal нижче екрана
// ховається (data-reveal="hidden") і з'являється (data-reveal="shown") за часом, а не за прокруткою, — однаково
// при повільній і швидкій прокрутці. Видиме одразу не ховаємо (без спалаху); без JS чи при
// prefers-reduced-motion: reduce усе лишається на місці. Затримка — --d (по черзі в ряду).
export function RevealOnScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "shown";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      if (el.getBoundingClientRect().top < innerHeight * 0.9) continue;
      el.dataset.reveal = "hidden";
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
