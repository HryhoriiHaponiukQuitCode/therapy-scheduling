"use client";

import { useEffect } from "react";

// Live-область AppShell (role="status", лишається змонтованою, як ActionMessage): скрінрідер оголошує лише зміну
// тексту вже наявної області, тому loading.tsx не рендерить власну, а пише «Loading…» у цю й очищає після.
export const ROUTE_STATUS_ID = "route-status";

export function LoadingStatus() {
  useEffect(() => {
    const region = document.getElementById(ROUTE_STATUS_ID);
    if (!region) return;
    region.textContent = "Loading…";
    return () => {
      region.textContent = "";
    };
  }, []);
  return null;
}
