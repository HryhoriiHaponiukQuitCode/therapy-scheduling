import { LoadingStatus } from "@/components/route-status";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNT_GRID, HomeShell } from "./shell";

// Миттєвий стан переходу на головну: той самий каркас (HomeShell), пари «підпис / значення» — скелетонами.
export default function HomeLoading() {
  return (
    <>
      <LoadingStatus />
      <HomeShell>
        <div className={ACCOUNT_GRID}>
          {Array.from({ length: 2 }, (_, pair) => (
            <div key={pair} className="flex flex-col gap-1">
              <Skeleton className="h-[18px] w-16" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </HomeShell>
    </>
  );
}
