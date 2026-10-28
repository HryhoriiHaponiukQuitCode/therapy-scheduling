import { LoadingStatus } from "@/components/route-status";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_GRID, ClientCardShell } from "./shell";

// Миттєвий стан переходу на картку клієнта: той самий каркас (ClientCardShell), пари «поле / значення» анкети
// дорослого (тип, дата народження, мова, email) — скелетонами.
export default function ClientCardLoading() {
  return (
    <>
      <LoadingStatus />
      <ClientCardShell>
        <div className={CARD_GRID}>
          {Array.from({ length: 4 }, (_, i) => [
            <Skeleton key={`label-${i}`} className="h-[18px] w-28" />,
            <Skeleton key={`value-${i}`} className="h-5 w-48" />,
          ])}
        </div>
      </ClientCardShell>
    </>
  );
}
