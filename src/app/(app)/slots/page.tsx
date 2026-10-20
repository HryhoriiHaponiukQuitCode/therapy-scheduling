import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/request-user";
import { isStaff } from "@/lib/roles";
import { formatPracticeTime, hasFreeSlots, NO_FREE_SLOTS_MESSAGE } from "@/lib/slots";
import { CONFIRM_FORM_ID, HOLD_FORM_ID } from "@/lib/holds";
import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { ChoiceList } from "@/components/choice-list";
import { DayGrid } from "@/components/day-grid";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { SlotsNavigation } from "@/components/slots-navigation";
import { StatusBadge } from "@/components/status-badge";
import { loadDayView } from "./data";
import { ConfirmHoldForm } from "./confirm-hold-form";
import { HoldSlotForm } from "./hold-slot-form";

// Слоти терапевта на вибраний день зі статусами (AC-HOLD-01, 05, 06, 18, 24) і прострочені утримання (AC-HOLD-20).
// Вигляд — design-system.md, розділи 4.2 і 5: ліворуч GET-форми «Therapist» і «Day», праворуч погодинна сітка дня
// і «Expired holds».
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) {
    redirect("/login");
  }

  if (!isStaff(user.role)) {
    return (
      <>
        <PageHeader title="Slots" />
        <p className="m-0">Only schedulers and admins can view therapists&apos; slots.</p>
      </>
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

  // Лінія «зараз» — лише коли вибрано сьогоднішній день (час практики).
  const nowTime = view.date === view.today ? formatPracticeTime(new Date()).slice(11) : null;
  const now = nowTime ? { time: nowTime, hour: nowTime.slice(0, 2), minute: Number(nowTime.slice(3)) } : null;

  const heading = (
    <h2 id="day-slots" className="m-0 text-[22px] leading-7 font-medium tracking-[-0.01em]">
      {view.therapist ? `${view.therapist.name} — ${view.date}` : "No therapists yet"}
    </h2>
  );
  const withSlots = Boolean(view.therapist) && view.slots.length > 0;

  return (
    <>
      <PageHeader title="Slots" description="Times in America/Los_Angeles." />

      <SlotsNavigation action="/slots" className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6 max-[1000px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="slots-therapist" title="Therapist">
            {/* Вибір терапевта одразу відправляє форму; поточний день — прихованим полем. */}
            <form method="get" action="/slots" data-navigate="">
              <input type="hidden" name="date" value={view.date} />
              {view.therapists.length > 0 ? (
                <ChoiceList
                  name="therapist"
                  value={view.therapist?.id ?? null}
                  choices={view.therapists.map((t) => ({ value: t.id, label: t.name }))}
                />
              ) : (
                <p className="m-0 text-muted">No therapists yet.</p>
              )}
            </form>
          </Panel>
          <Panel id="slots-day" title="Day">
            {/* Вибір дня одразу відправляє форму; поточний терапевт — прихованим полем. */}
            <form method="get" action="/slots" data-navigate="">
              {view.therapist ? <input type="hidden" name="therapist" value={view.therapist.id} /> : null}
              <Calendar name="date" value={view.date} today={view.today} />
            </form>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6 transition-opacity duration-200 group-data-[pending]/nav:opacity-60">
          <Panel labelledBy="day-slots">
            {view.error ? (
              <div className="flex flex-col gap-4">
                {heading}
                <ActionMessage state={{ status: "error", message: "Could not load slots. Try again later." }} />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Форми монтуємо для вибраного терапевта й дня зі слотами завжди, а не лише коли є що утримати чи
                    підтвердити: після останньої дії revalidatePath прибрав би форму разом із повідомленням про результат. */}
                {withSlots && !view.clientsError && view.clients.length > 0 ? (
                  // key: новий терапевт чи день — новий стан форми (без чужого повідомлення).
                  <HoldSlotForm
                    key={`${view.therapist!.id}-${view.date}`}
                    heading={heading}
                    therapistId={view.therapist!.id}
                    clients={view.clients}
                  />
                ) : (
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    {heading}
                    {withSlots && !view.clientsError ? (
                      <Link href="/clients" className="text-sm font-semibold text-navy underline underline-offset-[3px]">
                        Create a client to hold a slot
                      </Link>
                    ) : null}
                  </div>
                )}
                {withSlots && view.clientsError ? (
                  <ActionMessage
                    state={{ status: "error", message: "Could not load clients, so slots cannot be held right now." }}
                  />
                ) : null}
                {withSlots ? (
                  // key: новий терапевт чи день — новий стан форми (без чужого повідомлення).
                  <ConfirmHoldForm key={`confirm-${view.therapist!.id}-${view.date}`} />
                ) : null}
                {view.therapist && !hasFreeSlots(view.slots) ? (
                  <EmptyState role="status" data-testid="no-free-slots">
                    {NO_FREE_SLOTS_MESSAGE}
                  </EmptyState>
                ) : null}
                {view.slots.length > 0 ? <DayGrid rows={rows} now={now} data-testid="slot-list" /> : null}
              </div>
            )}
          </Panel>

          {/* AC-HOLD-24: у дні без жодного слоту — лише повідомлення, без інших розділів. */}
          {view.slots.length > 0 && view.expired.length > 0 ? (
            <Panel
              id="expired-holds-title"
              title="Expired holds"
              description="Upcoming slots of this therapist not confirmed within 24 hours — they are free again."
            >
              <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0" data-testid="expired-holds" aria-label="Expired holds">
                {view.expired.map((hold) => (
                  <li key={hold.id} className="slot-expired flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-lg px-3.5 py-3">
                    <b className="font-semibold">{formatPracticeTime(hold.slotStart)}</b>
                    <span>{hold.clientName}</span>
                    <StatusBadge status="Expired" />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </SlotsNavigation>
    </>
  );
}
