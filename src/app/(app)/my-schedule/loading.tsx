import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonRows } from "@/components/skeleton";

// Миттєвий стан переходу на /my-schedule: картки днів зі скелетонами слотів.
export default function MyScheduleLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="My schedule" description="Next 7 days, times in America/Los_Angeles." />
      {Array.from({ length: 3 }, (_, day) => (
        <Card key={day}>
          <Skeleton className="mb-5 h-[22px] w-28" />
          <SkeletonRows rows={3} columns={["w-12", "w-20", "w-28"]} />
        </Card>
      ))}
    </>
  );
}
