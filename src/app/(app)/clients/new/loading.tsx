import { LoadingStatus } from "@/components/route-status";
import { Skeleton, SkeletonField } from "@/components/ui/skeleton";
import { NewClientShell } from "./shell";

// Миттєвий стан переходу на /clients/new: той самий каркас (NewClientShell), обидві форми — скелетонами.
// Зверху «Client request»: підпис, багаторядкове поле, підказка й «Draft card» (зріз 4). Під межею — картка:
// тип, ім'я, дата народження, мова (поля email чи опікуна з'являються після вибору типу) і «Create client».
export default function NewClientLoading() {
  return (
    <>
      <LoadingStatus />
      <NewClientShell>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-[18px] w-28" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-11 w-[130px]" />
          </div>
          <div className="flex flex-col gap-4 border-t border-border pt-6">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonField key={i} />
            ))}
            <Skeleton className="h-12 w-[150px]" />
          </div>
        </div>
      </NewClientShell>
    </>
  );
}
