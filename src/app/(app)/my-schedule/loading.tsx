import { LoadingStatus } from "@/components/route-status";
import { SkeletonRows } from "@/components/ui/skeleton";
import { DayPanel, MyScheduleShell } from "./shell";

// Миттєвий стан переходу на /my-schedule: той самий каркас (MyScheduleShell, DayPanel), тиждень, заголовки днів
// і погодинна сітка — скелетонами.
export default function MyScheduleLoading() {
  return (
    <>
      <LoadingStatus />
      <MyScheduleShell>
        {Array.from({ length: 3 }, (_, day) => (
          <DayPanel key={day}>
            <SkeletonRows rows={3} rowClassName="min-h-[104px]" columns={["h-4 w-12", "h-[72px] flex-1 rounded-lg"]} />
          </DayPanel>
        ))}
      </MyScheduleShell>
    </>
  );
}
