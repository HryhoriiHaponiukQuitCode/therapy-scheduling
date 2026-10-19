import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { formatPracticeTime, hasFreeSlots, NO_FREE_SLOTS_MESSAGE } from "@/lib/slots";
import { CONFIRM_FORM_ID, HOLD_FORM_ID } from "@/lib/holds";
import { ActionMessage } from "@/components/action-message";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { DatePicker } from "@/components/date-picker";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { CalendarIcon, FilterIcon, HistoryIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Select } from "@/components/select";
import { SlotTable } from "@/components/slot-table";
import { loadDayView } from "./data";
import { ConfirmHoldForm } from "./confirm-hold-form";
import { HoldSlotForm } from "./hold-slot-form";

// Слоти терапевта на вибраний день зі статусами (AC-HOLD-01, 05, 06, 18, 24) і прострочені утримання (AC-HOLD-20).
// Вигляд — design-system.md, розділ 5: картки «Therapist and day», «<Терапевт> — <дата>», «Expired holds».
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  if (!isStaff(user.role)) {
    return (
      <AppShell user={user}>
        <PageHeader title="Slots" />
        <p className="m-0">Only schedulers and admins can view therapists&apos; slots.</p>
      </AppShell>
    );
  }

  const params = await searchParams;
  const view = await loadDayView(supabase, {
    therapist: typeof params.therapist === "string" ? params.therapist : undefined,
    date: typeof params.date === "string" ? params.date : undefined,
  });

  const rows = view.slots.map((slot) => ({
    key: `${view.therapist?.id}-${slot.start.toISOString()}`,
    time: slot.time,
    status: slot.status,
    client: slot.clientName,
    heldUntil: slot.heldUntil ? `Held until ${formatPracticeTime(slot.heldUntil)}` : null,
    action:
      slot.canHold && view.clients.length > 0 ? (
        <Button type="submit" variant="primary" form={HOLD_FORM_ID} name="slot_start" value={slot.start.toISOString()}>
          Hold {slot.time}
        </Button>
      ) : slot.canConfirm ? (
        <Button
          type="submit"
          variant="secondary"
          form={CONFIRM_FORM_ID}
          name="hold_id"
          value={`${slot.holdId!}|${slot.start.toISOString()}`}
        >
          Confirm {slot.time}
        </Button>
      ) : null,
  }));

  return (
    <AppShell user={user}>
      <PageHeader title="Slots" description="Times in America/Los_Angeles." />

      <form method="get">
        <Card id="slots-filter" title="Therapist and day" icon={<FilterIcon />}>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Therapist" htmlFor="slots-therapist" className="min-w-0 flex-[1_1_280px]">
              <Select
                key={view.therapist?.id ?? "none"}
                id="slots-therapist"
                name="therapist"
                defaultValue={view.therapist?.id}
                options={view.therapists.map((t) => ({ value: t.id, label: t.name }))}
              />
            </Field>
            <Field label="Day" htmlFor="slots-date" className="min-w-0 flex-[1_1_220px]">
              <DatePicker key={view.date} id="slots-date" name="date" defaultValue={view.date} today={view.today} />
            </Field>
            <Button type="submit" variant="primary" className="max-[720px]:w-full">
              Show
            </Button>
          </div>
        </Card>
      </form>

      <Card
        id="day-slots"
        title={view.therapist ? `${view.therapist.name} — ${view.date}` : "No therapists yet"}
        icon={<CalendarIcon />}
      >
        {view.error ? (
          <ActionMessage state={{ status: "error", message: "Could not load slots. Try again later." }} />
        ) : (
          <div className="flex flex-col gap-4">
            {view.therapist && !hasFreeSlots(view.slots) ? (
              <EmptyState role="status" data-testid="no-free-slots">
                {NO_FREE_SLOTS_MESSAGE}
              </EmptyState>
            ) : null}
            {/* Форми монтуємо для вибраного терапевта й дня зі слотами завжди, а не лише коли є що утримати чи
                підтвердити: після останньої дії revalidatePath прибрав би форму разом із повідомленням про результат. */}
            {view.therapist && view.slots.length > 0 ? (
              view.clientsError ? (
                <ActionMessage
                  state={{ status: "error", message: "Could not load clients, so slots cannot be held right now." }}
                />
              ) : view.clients.length > 0 ? (
                // key: новий терапевт чи день — новий стан форми (без чужого повідомлення).
                <HoldSlotForm
                  key={`${view.therapist.id}-${view.date}`}
                  therapistId={view.therapist.id}
                  clients={view.clients}
                />
              ) : (
                <Link href="/clients" className="text-sm underline underline-offset-[3px]">
                  Create a client to hold a slot
                </Link>
              )
            ) : null}
            {view.therapist && view.slots.length > 0 ? (
              // key: новий терапевт чи день — новий стан форми (без чужого повідомлення).
              <ConfirmHoldForm key={`confirm-${view.therapist.id}-${view.date}`} />
            ) : null}
            {view.slots.length > 0 ? <SlotTable rows={rows} withAction data-testid="slot-list" /> : null}
          </div>
        )}
      </Card>

      {/* AC-HOLD-24: у дні без жодного слоту — лише повідомлення, без інших розділів. */}
      {view.slots.length > 0 && view.expired.length > 0 ? (
        <Card id="expired-holds-title" title="Expired holds" icon={<HistoryIcon />}>
          <p className="-mt-4 mb-2 text-xs leading-4 text-muted">
            Upcoming slots of this therapist not confirmed within 24 hours — they are free again.
          </p>
          <SlotTable
            withHeader={false}
            data-testid="expired-holds"
            label="Expired holds"
            rows={view.expired.map((hold) => ({
              key: hold.id,
              time: formatPracticeTime(hold.slotStart),
              status: "Expired",
              client: hold.clientName,
              heldUntil: null,
            }))}
          />
        </Card>
      ) : null}
    </AppShell>
  );
}
