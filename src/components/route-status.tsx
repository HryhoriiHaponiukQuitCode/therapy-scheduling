"use client";

import { useEffect } from "react";
import { ROUTE_STATUS_ID } from "./route-status-id";

// Live-область AppShell (role="status", лишається змонтованою, як ActionMessage): скрінрідер оголошує лише зміну
// тексту вже наявної області. Пишуть у неї loading.tsx (LoadingStatus), RailLink і SlotsNavigation, поки перехід чекає сервера;
// лічильник, щоб завершення одного джерела не стерло «Loading…», поки інше ще чекає.
let pending = 0;

function render() {
  const region = document.getElementById(ROUTE_STATUS_ID);
  if (region) region.textContent = pending > 0 ? "Loading…" : "";
}

export function useLoadingAnnouncement(active: boolean) {
  useEffect(() => {
    if (!active) return;
    pending += 1;
    render();
    return () => {
      pending -= 1;
      render();
    };
  }, [active]);
}

export function LoadingStatus() {
  useLoadingAnnouncement(true);
  return null;
}
