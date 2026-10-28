import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { addDays, formatPracticeTime, practiceClock, practiceDate } from "@/lib/slots";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { DayGrid } from "@/components/day-grid";
import { EmptyState } from "@/components/empty-state";
import { NoAccess } from "@/components/no-access";
import { CalendarIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { loadMySchedule } from "./data";
import { DayPanel, MyScheduleShell } from "./shell";

// Розклад терапевта: власні слоти, утримання й сеанси за тиждень пн–нд з перемиканням тижнів (AC-HOLD-09, 21, 30,
// 31, 40). Вигляд — панель на кожен день із погодинною сіткою DayGrid (одна колонка без шапки) без дій
// (DESIGN.md, розділ 5); над днями — «Previous week» / «This week» / «Next week» (GET-параметр week).
export default async function MySchedulePage({ searchParams }: PageProps<"/my-schedule">) {
  const access = await getPageAccess(["therapist"], "Only therapists have a personal schedule.");
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="My schedule" message={access.message} />;
  const user = access.user;
  if (!user.email) {
    return <AccessDenied title="My schedule" message="Only therapists have a personal schedule." />;
  }

  const supabase = await createClient();

  const now = new Date();
  const { week } = await searchParams;
  const { weekStart, days, error } = await loadMySchedule(
    supabase,
    { email: user.email },
    now,
    typeof week === "string" ? week : undefined,
  );
  // Лінія «зараз» — лише в панелі сьогоднішнього дня (час практики).
  const nowLine = practiceClock(now);
  const today = practiceDate(now);
  const weekLink = (start: string) => `/my-schedule?week=${start}`;

  return (
    <MyScheduleShell
      week={{ start: weekStart, end: addDays(weekStart, 6) }}
      weekNav={
        <>
          <Link href={weekLink(addDays(weekStart, -7))} className={buttonClass("glass")}>
            Previous week
          </Link>
          <Link href="/my-schedule" className={buttonClass("glass")}>
            This week
          </Link>
          <Link href={weekLink(addDays(weekStart, 7))} className={buttonClass("glass")}>
            Next week
          </Link>
        </>
      }
    >
      {error ? (
        <ActionMessage state={{ status: "error", message: "Could not load your schedule. Try again later." }} />
      ) : (
        days.map((day) => (
          <DayPanel key={day.date} date={day.date} today={day.date === today}>
            {day.slots.length === 0 ? (
              <EmptyState icon={<CalendarIcon />}>No slots on this day.</EmptyState>
            ) : (
              <DayGrid
                label={`My slots on ${day.date}`}
                now={day.date === today ? nowLine : null}
                columns={[
                  {
                    key: day.date,
                    slots: day.slots.map((slot) => ({
                      key: slot.start.toISOString(),
                      time: slot.time,
                      status: slot.status,
                      client: slot.clientName,
                      heldUntil: slot.heldUntil ? `Held until ${formatPracticeTime(slot.heldUntil)}` : null,
                    })),
                  },
                ]}
              />
            )}
          </DayPanel>
        ))
      )}
    </MyScheduleShell>
  );
}
