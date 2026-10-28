"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// three.js — лише в окремому чанку й лише від 1100px: на вужчих екранах капсули немає (hero без неї повний),
// і чанк не завантажується зовсім. На сервері капсула не рендериться: місце тримає квадратна обгортка в hero.
const LandingPillScene = dynamic(() => import("./landing-pill-scene").then((m) => m.LandingPillScene), {
  ssr: false,
});

const WIDE = "(min-width: 1100px)";

// І «change» запиту, і resize: деякі емуляції розміру вікна не надсилають «change»; рендер лише коли значення змінилось.
function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function LandingPill() {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return wide ? <LandingPillScene /> : null;
}
