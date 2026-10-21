import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonRows } from "@/components/skeleton";

// Миттєвий стан переходу на /my-schedule: панелі днів зі скелетонами погодинної сітки.
export default function MyScheduleLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="My schedule" description="Next 7 days, times in America/Los_Angeles." />
      {Array.from({ length: 3 }, (_, day) => (
        <Panel key={day}>
          <Skeleton className="mb-5 h-7 w-36" />
          <SkeletonRows rows={3} rowClassName="min-h-[104px]" columns={["h-4 w-12", "h-[72px] flex-1 rounded-lg"]} />
        </Panel>
      ))}
    </>
  );
}
