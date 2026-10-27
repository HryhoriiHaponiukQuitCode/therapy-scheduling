import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { STAFF_ONLY_PAGE_MESSAGE, STAFF_ROLES } from "@/lib/roles";
import { formatPracticeTime, hasFreeSlots, NO_FREE_SLOTS_MESSAGE, practiceClock, weekdayName } from "@/lib/slots";
import { CONFIRM_FORM_ID, holdFormId } from "@/lib/holds";
import { CLIENT_SEARCH_MAX, MORE_CLIENTS_MESSAGE, noClientMatchMessage } from "@/lib/clients";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Calendar } from "@/components/calendar";
import { ChoiceList } from "@/components/choice-list";
import { DayGrid, type DayGridColumn } from "@/components/day-grid";
import { EmptyState } from "@/components/empty-state";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { SlotsNavigation } from "@/components/slots-navigation";
import { StatusBadge } from "@/components/ui/badge";
import { loadDayView, type TherapistDay } from "./data";
import { ConfirmHoldForm } from "./confirm-hold-form";
import { HoldSlotForm } from "./hold-slot-form";

// Слоти вибраних терапевтів на вибраний день зі статусами (AC-HOLD-01, 05, 06, 18, 24) і прострочені утримання
// (AC-HOLD-20). Вигляд — DESIGN.md, розділи 4.2 і 5: ліворуч GET-форми «Therapists» (кілька) і «Day»,
// праворуч спільна погодинна сітка з колонкою на кожного терапевта і «Expired holds».
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  // Перевірка доступу — до будь-якого запиту даних: терапевт за прямим посиланням бачить лише відмову (AC-HOLD-44).
  const access = await getPageAccess(STAFF_ROLES, STAFF_ONLY_PAGE_MESSAGE);
  if (access.kind === "no-role") return <NoAccess />;
  if (access.kind === "forbidden") return <AccessDenied title="Slots" message={access.message} />;

  const supabase = await createClient();

  const params = await searchParams;
  const therapistParam = params.therapist;
  const view = await loadDayView(supabase, {
    therapists: Array.isArray(therapistParam) ? therapistParam : therapistParam ? [therapistParam] : [],
    date: typeof params.date === "string" ? params.date : undefined,
    q: typeof params.q === "string" ? params.q : undefined,
  });

  const canHold = !view.clientsError && view.clients.length > 0;
  // Форма утримання з пошуком — і коли пошук нічого не знайшов: інакше не було б де змінити запит.
  const showHoldForm = !view.clientsError && (view.clients.length > 0 || view.q !== "");
  const withSlots = view.days.some((day) => day.slots.length > 0);
  // AC-HOLD-24: терапевт без жодного слоту цього дня — лише повідомлення в його колонці, його прострочених
  // утримань у панелі «Expired holds» не показуємо.
  const withSlotIds = new Set(view.days.filter((day) => day.slots.length > 0).map((day) => day.therapist.id));
  const expired = view.expired.filter((hold) => withSlotIds.has(hold.therapistId));

  const column = ({ therapist, slots }: TherapistDay): DayGridColumn => {
    const free = slots.filter((slot) => slot.status === "Free").length;
    return {
      key: therapist.id,
      header: (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={therapist.name} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold" title={therapist.name}>
              {therapist.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {slots.length > 0 ? `${free} free of ${slots.length}` : "No slots"}
            </span>
          </span>
        </span>
      ),
      // AC-HOLD-18 і AC-HOLD-24: повідомлення в колонці терапевта, над його слотами (якщо вони є).
      message: !hasFreeSlots(slots) ? (
        <EmptyState role="status" data-testid="no-free-slots">
          {NO_FREE_SLOTS_MESSAGE}
        </EmptyState>
      ) : undefined,
      slots: slots.map((slot) => ({
        key: `${therapist.id}-${slot.start.toISOString()}`,
        time: slot.time,
        status: slot.status,
        client: slot.clientName,
        heldUntil: slot.heldUntil ? `Held until ${formatPracticeTime(slot.heldUntil)}` : null,
        action:
          slot.canHold && canHold ? (
            <Button
              type="submit"
              variant="primary"
              form={holdFormId(therapist.id)}
              name="slot_start"
              value={slot.start.toISOString()}
              aria-label={`Hold ${slot.time}, ${therapist.name}`}
            >
              Hold
            </Button>
          ) : slot.canConfirm ? (
            <Button
              type="submit"
              variant="secondary"
              form={CONFIRM_FORM_ID}
              name="hold_id"
              value={`${slot.holdId!}|${slot.start.toISOString()}`}
              aria-label={`Confirm ${slot.time}, ${therapist.name}`}
            >
              Confirm
            </Button>
          ) : null,
      })),
    };
  };

  // Лінія «зараз» — лише коли вибрано сьогоднішній день (час практики).
  const now = view.date === view.today ? practiceClock(new Date()) : null;

  const heading = (
    <div className="min-w-0">
      <h2 id="day-slots" className="m-0 text-[22px] leading-7 font-medium tracking-[-0.01em]">
        {view.selected.length > 0 ? view.date : "No therapists yet"}
      </h2>
      {view.selected.length > 0 ? (
        <p className="mt-1 mb-0 text-muted-foreground">
          {weekdayName(view.date)} · {view.selected.length}{" "}
          {view.selected.length === 1 ? "therapist" : "therapists"}
        </p>
      ) : null}
    </div>
  );

  // AC-CARD-02: пошук клієнта за ім'ям, email або email опікуна — GET-параметр q, вибрані терапевти й день лишаються.
  const search = (
    <form method="get" action="/slots" data-navigate="" role="search" className="flex min-w-0 flex-[1_1_280px] items-end gap-2">
      {view.selected.map((t) => (
        <input key={t.id} type="hidden" name="therapist" value={t.id} />
      ))}
      <input type="hidden" name="date" value={view.date} />
      <Field label="Find a client" htmlFor="client-search" className="min-w-0 flex-1">
        <Input
          id="client-search"
          type="search"
          name="q"
          defaultValue={view.q}
          maxLength={CLIENT_SEARCH_MAX}
          placeholder="Name, email or guardian email"
        />
      </Field>
      <Button type="submit" variant="glass">
        Search
      </Button>
    </form>
  );

  return (
    <>
      <PageHeader title="Slots" description="Times in America/Los_Angeles." />

      <SlotsNavigation className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="slots-therapists" title="Therapists" description="Choose whose slots to show side by side.">
            {/* Зміна вибору одразу відправляє форму; поточний день — прихованим полем. */}
            <form method="get" action="/slots" data-navigate="">
              <input type="hidden" name="date" value={view.date} />
              {view.q ? <input type="hidden" name="q" value={view.q} /> : null}
              {view.therapists.length > 0 ? (
                <ChoiceList
                  name="therapist"
                  values={view.selected.map((t) => t.id)}
                  choices={view.therapists.map((t) => ({ value: t.id, label: t.name }))}
                />
              ) : (
                <p className="m-0 text-muted-foreground">No therapists yet.</p>
              )}
            </form>
          </Panel>
          <Panel id="slots-day" title="Day">
            {/* Вибір дня одразу відправляє форму; вибрані терапевти — прихованими полями. */}
            <form method="get" action="/slots" data-navigate="">
              {view.selected.map((t) => (
                <input key={t.id} type="hidden" name="therapist" value={t.id} />
              ))}
              {view.q ? <input type="hidden" name="q" value={view.q} /> : null}
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
                {/* Форми монтуємо для вибраного дня зі слотами завжди, а не лише коли є що утримати чи
                    підтвердити: після останньої дії revalidatePath прибрав би форму разом із повідомленням про результат. */}
                {withSlots && showHoldForm ? (
                  // key: новий день, набір терапевтів чи пошук — новий стан форми (без чужого повідомлення й без
                  // вибраного клієнта, якого вже немає серед знайдених).
                  <HoldSlotForm
                    key={`${view.date}-${view.selected.map((t) => t.id).join()}-${view.q}`}
                    heading={heading}
                    search={search}
                    notice={
                      view.clients.length === 0
                        ? noClientMatchMessage(view.q)
                        : view.clientsTruncated
                          ? MORE_CLIENTS_MESSAGE
                          : null
                    }
                    therapistIds={view.days.filter((day) => day.slots.length > 0).map((day) => day.therapist.id)}
                    clients={view.clients}
                  />
                ) : (
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    {heading}
                    {withSlots && !view.clientsError ? (
                      <Link href="/clients" className="text-sm font-semibold text-primary underline underline-offset-[3px]">
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
                {withSlots ? <ConfirmHoldForm key={`confirm-${view.date}-${view.selected.map((t) => t.id).join()}`} /> : null}
                {view.days.length > 0 ? (
                  <DayGrid
                    columns={view.days.map(column)}
                    now={now}
                    label={`Slots on ${view.date}`}
                    data-testid="slot-list"
                  />
                ) : null}
              </div>
            )}
          </Panel>

          {/* AC-HOLD-24: у дні без жодного слоту — лише повідомлення, без інших розділів. */}
          {expired.length > 0 ? (
            <Panel
              id="expired-holds-title"
              title="Expired holds"
              description="Upcoming slots of these therapists not confirmed within 24 hours — they are free again."
            >
              <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0" data-testid="expired-holds" aria-label="Expired holds">
                {expired.map((hold) => (
                  <li key={hold.id} className="slot-expired flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-lg px-3.5 py-3">
                    <b className="font-semibold">{formatPracticeTime(hold.slotStart)}</b>
                    <span>{hold.clientName}</span>
                    <span className="text-muted-foreground">{hold.therapistName}</span>
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
