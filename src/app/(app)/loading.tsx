import { LoadingStatus } from "@/components/route-status";
import { Skeleton } from "@/components/ui/skeleton";
import { DaysPanel, HomeShell, StatTiles } from "./shell";

// Миттєвий стан переходу на головну: той самий каркас (HomeShell), плитки й стовпці — скелетонами. Роль ще невідома,
// тож панелі «By therapist» (лише для адміністратора й планувальника) у скелетоні немає.
export default function HomeLoading() {
  return (
    <>
      <LoadingStatus />
      <HomeShell>
        <StatTiles>
          {Array.from({ length: 4 }, (_, tile) => (
            <div key={tile} className="glass flex flex-col gap-2 rounded-lg p-5">
              <Skeleton className="h-[18px] w-24" />
              <Skeleton className="h-10 w-16 rounded-sm" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </StatTiles>
        <DaysPanel>
          <div aria-hidden className="flex flex-col gap-4">
            <Skeleton className="h-5 w-64" />
            <div className="grid h-[244px] grid-cols-7 items-end gap-1 border-b border-border pb-2">
              {["h-24", "h-32", "h-28", "h-36", "h-20", "h-10", "h-10"].map((height, day) => (
                <Skeleton key={day} className={`mx-auto w-6 rounded-t-[4px] rounded-b-none ${height}`} />
              ))}
            </div>
          </div>
        </DaysPanel>
      </HomeShell>
    </>
  );
}
