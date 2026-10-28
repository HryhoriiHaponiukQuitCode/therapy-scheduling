import { LoadingStatus } from "@/components/route-status";
import { Skeleton } from "@/components/ui/skeleton";
import { SlotsShell } from "./shell";

// Миттєвий стан переходу на /slots: той самий каркас (SlotsShell) — панелі «Therapists», «Day» і сітка колонок
// терапевтів, вміст — скелетонами.
export default function SlotsLoading() {
  return (
    <>
      <LoadingStatus />
      <SlotsShell
        therapists={
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-md" />
            ))}
          </div>
        }
        day={<Skeleton className="h-[330px] w-full rounded-lg" />}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-12 w-full max-w-[420px]" />
          </div>
          {/* Шапки колонок терапевтів і погодинні клітинки з картками. */}
          <div aria-hidden className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-x-3 gap-y-3 max-[760px]:grid-cols-[52px_minmax(0,1fr)]">
            {Array.from({ length: 4 * 4 }, (_, i) =>
              i % 4 === 0 ? (
                i === 0 ? <span key={i} /> : <Skeleton key={i} className="mt-2 h-4 w-12" />
              ) : (
                <Skeleton
                  key={i}
                  className={`${i < 4 ? "h-10" : "h-[108px]"} w-full rounded-lg ${i % 4 > 1 ? "max-[760px]:hidden" : ""}`}
                />
              ),
            )}
          </div>
        </div>
      </SlotsShell>
    </>
  );
}
