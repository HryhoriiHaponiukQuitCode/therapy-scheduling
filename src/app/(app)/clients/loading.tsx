import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonField, SkeletonRows } from "@/components/ui/skeleton";

// Миттєвий стан переходу на /clients: ті самі панелі, що й на сторінці, зі скелетонами замість даних.
export default function ClientsLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="Clients" />
      <div className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6 max-[1000px]:grid-cols-1">
        <Panel title="New client">
          <div className="flex flex-col gap-4">
            <SkeletonField />
            <SkeletonField />
            <Skeleton className="h-12 w-36" />
          </div>
        </Panel>
        <Panel title="All clients">
          <SkeletonRows rows={4} columns={["size-10 flex-none", "h-4 w-32", "h-4 w-48"]} />
        </Panel>
      </div>
    </>
  );
}
