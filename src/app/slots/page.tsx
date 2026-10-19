import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isStaff } from "@/lib/roles";
import { formatPracticeTime, hasFreeSlots, NO_FREE_SLOTS_MESSAGE, type SlotStatus } from "@/lib/slots";
import { loadDayView } from "./data";
import { CONFIRM_FORM_ID, HOLD_FORM_ID } from "@/lib/holds";
import { ConfirmHoldForm } from "./confirm-hold-form";
import { HoldSlotForm } from "./hold-slot-form";

const STATUS_STYLE: Record<SlotStatus, string> = {
  Free: "border-green-600 text-green-700 dark:text-green-400",
  Held: "border-amber-600 text-amber-700 dark:text-amber-400",
  Confirmed: "border-zinc-500 text-zinc-600 dark:text-zinc-300",
};

// Слоти терапевта на вибраний день зі статусами (AC-HOLD-01, AC-HOLD-05, AC-HOLD-06, AC-HOLD-18).
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  if (!isStaff(user.role)) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Slots</h1>
        <p className="text-sm">Only schedulers and admins can view therapists&apos; slots.</p>
        <Link href="/" className="text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  const params = await searchParams;
  const view = await loadDayView(supabase, {
    therapist: typeof params.therapist === "string" ? params.therapist : undefined,
    date: typeof params.date === "string" ? params.date : undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Slots</h1>
        <Link href="/" className="text-sm underline">
          Home
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Therapist
          <select
            name="therapist"
            defaultValue={view.therapist?.id}
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {view.therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Day
          <input
            name="date"
            type="date"
            defaultValue={view.date}
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded bg-foreground px-4 py-2 font-medium text-background"
        >
          Show
        </button>
      </form>

      <section aria-labelledby="day-slots" className="flex flex-col gap-3">
        <h2 id="day-slots" className="text-lg font-medium">
          {view.therapist ? `${view.therapist.name} — ${view.date}` : "No therapists yet"}
        </h2>
        <p className="text-xs text-zinc-500">Times in America/Los_Angeles.</p>

        {view.error ? (
          <p role="alert" className="text-sm text-red-600">
            Could not load slots. Try again later.
          </p>
        ) : (
          <>
            {view.therapist && !hasFreeSlots(view.slots) ? (
              <p role="status" className="text-sm font-medium" data-testid="no-free-slots">
                {NO_FREE_SLOTS_MESSAGE}
              </p>
            ) : null}
            {view.therapist && view.slots.some((slot) => slot.canHold) ? (
              view.clientsError ? (
                <p role="alert" className="text-sm text-red-600">
                  Could not load clients, so slots cannot be held right now.
                </p>
              ) : view.clients.length > 0 ? (
                // key: новий терапевт чи день — новий стан форми (без чужого повідомлення).
                <HoldSlotForm
                  key={`${view.therapist.id}-${view.date}`}
                  therapistId={view.therapist.id}
                  clients={view.clients}
                />
              ) : (
                <Link href="/clients" className="text-sm underline">
                  Create a client to hold a slot
                </Link>
              )
            ) : null}
            {view.therapist && view.slots.some((slot) => slot.holdId) ? (
              // key: новий терапевт чи день — новий стан форми (без чужого повідомлення).
              <ConfirmHoldForm key={`confirm-${view.therapist.id}-${view.date}`} />
            ) : null}
            {view.slots.length > 0 ? (
              <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800" data-testid="slot-list">
                {view.slots.map((slot) => (
                  <li
                    key={`${view.therapist?.id}-${slot.start.toISOString()}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <span className="font-mono">{slot.time}</span>
                    <span className="flex flex-wrap items-center gap-3">
                      {slot.clientName ? <span>{slot.clientName}</span> : null}
                      {slot.heldUntil ? (
                        <span className="text-zinc-500">Held until {formatPracticeTime(slot.heldUntil)}</span>
                      ) : null}
                      <span className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLE[slot.status]}`}>
                        {slot.status}
                      </span>
                    </span>
                    {slot.canHold && view.clients.length > 0 ? (
                      <button
                        type="submit"
                        form={HOLD_FORM_ID}
                        name="slot_start"
                        value={slot.start.toISOString()}
                        className="min-h-11 rounded bg-foreground px-3 py-1 text-sm font-medium text-background"
                      >
                        Hold {slot.time}
                      </button>
                    ) : null}
                    {slot.holdId ? (
                      <button
                        type="submit"
                        form={CONFIRM_FORM_ID}
                        name="hold_id"
                        value={slot.holdId}
                        className="min-h-11 rounded border border-foreground px-3 py-1 text-sm font-medium"
                      >
                        Confirm {slot.time}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
