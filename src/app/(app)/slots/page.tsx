import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { STAFF_ONLY_PAGE_MESSAGE, STAFF_ROLES } from "@/lib/roles";
import { formatPracticeTime, hasFreeSlots, NO_FREE_SLOTS_MESSAGE, practiceClock, weekdayName } from "@/lib/slots";
import { CONFIRM_FORM_ID, holdFormId } from "@/lib/holds";
import { AccessDenied } from "@/components/access-denied";
import { ActionMessage } from "@/components/action-message";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/calendar";
import { ChoiceList } from "@/components/choice-list";
import { ColumnNotice, DayGrid, type DayGridColumn } from "@/components/day-grid";
import { NoAccess } from "@/components/no-access";
import { CLIENTS_ERROR_MESSAGE, loadDayView, toClientChoices, type TherapistDay } from "./data";
import { ConfirmHoldForm } from "./confirm-hold-form";
import { HoldButton, HoldClientProvider } from "./hold-client";
import { HoldClientPicker, HoldForms } from "./hold-slot-form";
import { SlotsShell } from "./shell";

// Слоти вибраних терапевтів на вибраний день зі статусами (AC-HOLD-01, 05, 06, 18, 24, 32, 33). Прострочені й
// чинні утримання — окрема сторінка /holds. Вигляд — DESIGN.md, розділи 4.2 і 5: ліворуч GET-форми «Therapists»
// (кілька) і «Day», праворуч спільна погодинна сітка з колонкою на кожного терапевта.
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
  });

  // Утримувати можна, коли є хоч один клієнт: тоді є поле «Client» з пошуком (далі — findClients).
  const canHold = !view.clients.error && view.clients.clients.length > 0;
  const withSlots = view.days.some((day) => day.slots.length > 0);

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
            {/* AC-HOLD-18, AC-HOLD-24, AC-HOLD-33: повідомлення над слотами колонки — у її шапці, одним рядком. */}
            {!hasFreeSlots(slots) ? (
              <ColumnNotice role="status" data-testid="no-free-slots">
                {NO_FREE_SLOTS_MESSAGE}
              </ColumnNotice>
            ) : null}
          </span>
        </span>
      ),
      slots: slots.map((slot) => ({
        key: `${therapist.id}-${slot.start.toISOString()}`,
        time: slot.time,
        status: slot.status,
        client: slot.clientName,
        heldUntil: slot.heldUntil ? `Held until ${formatPracticeTime(slot.heldUntil)}` : null,
        action:
          slot.canHold && canHold ? (
            <HoldButton
              type="submit"
              variant="primary"
              form={holdFormId(therapist.id)}
              name="slot_start"
              value={slot.start.toISOString()}
              aria-label={`Hold ${slot.time}, ${therapist.name}`}
            >
              Hold
            </HoldButton>
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

  return (
    <SlotsShell
      therapists={
        <>
          {/* Зміна вибору одразу відправляє форму; поточний день — прихованим полем. */}
          <form method="get" action="/slots" data-navigate="">
            <input type="hidden" name="date" value={view.date} />
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
        </>
      }
      day={
        <>
          {/* Вибір дня одразу відправляє форму; вибрані терапевти — прихованими полями. */}
          <form method="get" action="/slots" data-navigate="">
            {view.selected.map((t) => (
              <input key={t.id} type="hidden" name="therapist" value={t.id} />
            ))}
            <Calendar name="date" value={view.date} today={view.today} />
          </form>
        </>
      }
    >
      {view.error ? (
        <div className="flex flex-col gap-4">
          {heading}
          <ActionMessage state={{ status: "error", message: "Could not load slots. Try again later." }} />
        </div>
      ) : (
        <HoldClientProvider key={`${view.date}-${view.selected.map((t) => t.id).join()}`}>
        <div className="flex flex-col gap-4">
          {/* Форми монтуємо для вибраного дня зі слотами завжди, а не лише коли є що утримати чи
              підтвердити: після останньої дії revalidatePath прибрав би форму разом із повідомленням про результат. */}
          {withSlots && canHold ? (
            // key у HoldClientProvider: новий день чи набір терапевтів — новий стан форми (без чужого повідомлення
            // й без вибраного раніше клієнта).
            <HoldClientPicker heading={heading} initial={toClientChoices(view.clients)} />
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4">
              {heading}
              {withSlots && !view.clients.error ? (
                <Link href="/clients" className="text-sm font-semibold text-primary underline underline-offset-[3px]">
                  Create a client to hold a slot
                </Link>
              ) : null}
            </div>
          )}
          {withSlots && view.clients.error ? (
            <ActionMessage state={{ status: "error", message: CLIENTS_ERROR_MESSAGE }} />
          ) : null}
          {/* Результати Hold і Confirm — sticky вгорі панелі: їх видно, навіть коли кнопку натиснули внизу сітки. */}
          {withSlots ? (
            <div className="sticky top-3 z-10 flex flex-col">
              {canHold ? (
                <HoldForms therapistIds={view.days.filter((day) => day.slots.length > 0).map((day) => day.therapist.id)} />
              ) : null}
              <ConfirmHoldForm />
            </div>
          ) : null}
          {view.days.length > 0 ? (
            <DayGrid
              columns={view.days.map(column)}
              now={now}
              label={`Slots on ${view.date}`}
              data-testid="slot-list"
            />
          ) : null}
        </div>
        </HoldClientProvider>
      )}
    </SlotsShell>
  );
}
