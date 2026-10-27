import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { addDays, formatPracticeTime, practiceClock, practiceDate, weekdayName } from "@/lib/slots";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { DayGrid } from "@/components/day-grid";
import { EmptyState } from "@/components/empty-state";
import { NoAccess } from "@/components/no-access";
import { CalendarIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { loadMySchedule } from "./data";

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
    <>
      <PageHeader
        title="My schedule"
        description={`Week ${weekStart} – ${addDays(weekStart, 6)}, times in America/Los_Angeles.`}
      />
      <nav aria-label="Weeks" className="flex flex-wrap gap-2">
        <Link href={weekLink(addDays(weekStart, -7))} className={buttonClass("glass")}>
          Previous week
        </Link>
        <Link href="/my-schedule" className={buttonClass("glass")}>
          This week
        </Link>
        <Link href={weekLink(addDays(weekStart, 7))} className={buttonClass("glass")}>
          Next week
        </Link>
      </nav>
      {error ? (
        <ActionMessage state={{ status: "error", message: "Could not load your schedule. Try again later." }} />
      ) : (
        days.map((day) => (
          <Panel
            key={day.date}
            id={`day-${day.date}`}
            title={`${weekdayName(day.date)}, ${day.date}${day.date === today ? ", today" : ""}`}
          >
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
          </Panel>
        ))
      )}
    </>
  );
}
