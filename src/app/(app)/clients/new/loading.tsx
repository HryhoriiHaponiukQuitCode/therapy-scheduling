import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonField } from "@/components/ui/skeleton";
import { NewClientShell } from "./shell";

// Миттєвий стан переходу на /clients/new: той самий каркас (NewClientShell), порожня форма — скелетонами:
// тип, ім'я, дата народження, мова (поля email чи опікуна з'являються після вибору типу) і «Create client».
export default function NewClientLoading() {
  return (
    <>
      <LoadingStatus />
      <NewClientShell>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonField key={i} />
          ))}
          <Skeleton className="h-12 w-[150px]" />
        </div>
      </NewClientShell>
    </>
  );
}
