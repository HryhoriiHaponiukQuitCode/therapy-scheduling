import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";

// Миттєвий стан переходу на /holds: та сама панель зі скелетонами рядків утримань.
export default function HoldsLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="Holds" description="Held and expired holds of upcoming slots. Times in America/Los_Angeles." />
      <Panel className="max-w-[880px]">
        <Skeleton className="mb-5 h-7 w-44" />
        <SkeletonRows rows={4} rowClassName="min-h-12" columns={["h-4 w-32", "h-4 flex-1", "h-6 w-20 rounded-full"]} />
      </Panel>
    </>
  );
}
