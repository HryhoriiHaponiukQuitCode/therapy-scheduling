import { Card } from "@/components/card";
import { FilterIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonField, SkeletonRows } from "@/components/skeleton";

// Миттєвий стан переходу на /slots: фільтр і таблиця слотів зі скелетонами.
export default function SlotsLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="Slots" description="Times in America/Los_Angeles." />
      <Card title="Therapist and day" icon={<FilterIcon />}>
        <div className="flex flex-wrap items-end gap-4">
          <SkeletonField className="min-w-0 flex-[1_1_280px]" />
          <SkeletonField className="min-w-0 flex-[1_1_220px]" />
          <Skeleton className="h-11 w-20 max-[720px]:w-full" />
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-4">
          <Skeleton className="mb-1 h-[22px] w-56" />
          <Skeleton className="h-[68px] w-full rounded-lg" />
          <SkeletonRows rows={6} columns={["w-12", "w-20", "w-28", "ml-auto w-24"]} />
        </div>
      </Card>
    </>
  );
}
