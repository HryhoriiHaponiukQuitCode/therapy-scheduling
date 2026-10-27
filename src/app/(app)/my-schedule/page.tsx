import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/request-user";
import { formatPracticeTime, practiceClock, practiceDate } from "@/lib/slots";
import { ActionMessage } from "@/components/action-message";
import { DayGrid } from "@/components/day-grid";
import { EmptyState } from "@/components/empty-state";
import { CalendarIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { loadMySchedule } from "./data";

// Розклад терапевта: власні слоти, утримання й сеанси на 7 днів (AC-HOLD-09, AC-HOLD-21).
// Вигляд — панель на кожен день із погодинною сіткою DayGrid (одна колонка без шапки) без дій (DESIGN.md, розділ 5).
export default async function MySchedulePage() {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "therapist" || !user.email) {
    return (
      <>
        <PageHeader title="My schedule" />
        <p className="m-0">Only therapists have a personal schedule.</p>
      </>
    );
  }

  const now = new Date();
  const { days, error } = await loadMySchedule(supabase, { id: user.id, email: user.email }, now);
  // Лінія «зараз» — лише в панелі сьогоднішнього дня (час практики).
  const nowLine = practiceClock(now);
  const today = practiceDate(now);

  return (
    <>
      <PageHeader title="My schedule" description="Next 7 days, times in America/Los_Angeles." />
      {error ? (
        <ActionMessage state={{ status: "error", message: "Could not load your schedule. Try again later." }} />
      ) : (
        days.map((day) => (
          <Panel key={day.date} id={`day-${day.date}`} title={day.date === today ? `${day.date}, today` : day.date}>
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
