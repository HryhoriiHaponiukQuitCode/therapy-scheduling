import { Card } from "@/components/card";
import { UserIcon } from "@/components/icons";
import { LoadingStatus } from "@/components/route-status";
import { Skeleton } from "@/components/skeleton";

// Миттєвий стан переходу на головну: та сама картка з парами «підпис / значення» зі скелетонами.
export default function HomeLoading() {
  return (
    <>
      <LoadingStatus />
      <Card title="Проєкт команди" icon={<UserIcon />} headingLevel={1}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-12 gap-y-6">
          {Array.from({ length: 2 }, (_, pair) => (
            <div key={pair} className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
