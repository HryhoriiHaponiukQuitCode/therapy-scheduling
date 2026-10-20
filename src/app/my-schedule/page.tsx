import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/roles";
import { formatPracticeTime } from "@/lib/slots";
import { ActionMessage } from "@/components/action-message";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { CalendarIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SlotTable } from "@/components/slot-table";
import { loadMySchedule } from "./data";

// Розклад терапевта: власні слоти, утримання й сеанси на 7 днів (AC-HOLD-09, AC-HOLD-21).
// Вигляд — картка на кожен день із SlotTable без колонки дії (design-system.md, розділ 5).
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

  const { days, error } = await loadMySchedule(supabase, { id: user.id, email: user.email }, new Date());

  return (
    <>
      <PageHeader title="My schedule" description="Next 7 days, times in America/Los_Angeles." />
      {error ? (
        <ActionMessage state={{ status: "error", message: "Could not load your schedule. Try again later." }} />
      ) : (
        days.map((day) => (
          <Card key={day.date} id={`day-${day.date}`} title={day.date} icon={<CalendarIcon />}>
            {day.slots.length === 0 ? (
              <EmptyState>No slots on this day.</EmptyState>
            ) : (
              <SlotTable
                rows={day.slots.map((slot) => ({
                  key: slot.start.toISOString(),
                  time: slot.time,
                  status: slot.status,
                  client: slot.clientName,
                  heldUntil: slot.heldUntil ? `Held until ${formatPracticeTime(slot.heldUntil)}` : null,
                }))}
              />
            )}
          </Card>
        ))
      )}
    </>
  );
}
