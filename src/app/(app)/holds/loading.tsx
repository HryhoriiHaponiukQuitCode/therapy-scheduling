import { LoadingStatus } from "@/components/route-status";
import { HOLD_LIST, HoldRowSkeleton, HoldsShell } from "./shell";

// Миттєвий стан переходу на /holds: той самий каркас (HoldsShell) — панель «Upcoming holds», рядки — скелетонами.
export default function HoldsLoading() {
  return (
    <>
      <LoadingStatus />
      <HoldsShell>
        {/* mt-4 — відступ, який на сторінці дає порожня форма підтвердження над списком (gap-4). */}
        <ul aria-hidden className={`${HOLD_LIST} mt-4`}>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <HoldRowSkeleton />
            </li>
          ))}
        </ul>
      </HoldsShell>
    </>
  );
}
