import { Card } from "@/components/card";
import { UserIcon, UsersIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { LoadingStatus, Skeleton, SkeletonField, SkeletonRows } from "@/components/skeleton";

// Миттєвий стан переходу на /clients: ті самі картки, що й на сторінці, з скелетонами замість даних.
export default function ClientsLoading() {
  return (
    <>
      <LoadingStatus />
      <PageHeader title="Clients" />
      <Card title="New client" icon={<UserIcon />}>
        <div className="flex flex-col gap-4">
          <SkeletonField />
          <SkeletonField />
          <Skeleton className="h-11 w-36" />
        </div>
      </Card>
      <Card title="All clients" icon={<UsersIcon />}>
        <SkeletonRows rows={4} columns={["w-32", "w-48"]} />
      </Card>
    </>
  );
}
