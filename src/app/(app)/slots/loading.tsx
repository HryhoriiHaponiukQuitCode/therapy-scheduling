import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonRows } from "@/components/skeleton";

// Миттєвий стан переходу на /slots: ті самі панелі «Therapist», «Day» і сітка дня зі скелетонами.
export default function SlotsLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="Slots" description="Times in America/Los_Angeles." />
      <div className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6 max-[1000px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Therapist">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Panel>
          <Panel title="Day">
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </Panel>
        </div>
        <Panel>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-12 w-full max-w-[320px]" />
            </div>
            <SkeletonRows rows={6} rowClassName="min-h-[104px]" columns={["w-12", "h-[72px] flex-1 rounded-lg"]} />
          </div>
        </Panel>
      </div>
    </>
  );
}
