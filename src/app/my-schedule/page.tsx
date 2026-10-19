import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/roles";
import { formatPracticeTime } from "@/lib/slots";
import { loadMySchedule } from "./data";

// Розклад терапевта: власні слоти, утримання й сеанси на 7 днів (AC-HOLD-09, AC-HOLD-21).
export default async function MySchedulePage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "therapist" || !user.email) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">My schedule</h1>
        <p className="text-sm">Only therapists have a personal schedule.</p>
        <Link href="/" className="text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  const { days, error } = await loadMySchedule(supabase, { id: user.id, email: user.email }, new Date());

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">My schedule</h1>
        <Link href="/" className="text-sm underline">
          Home
        </Link>
      </div>
      <p className="text-xs text-zinc-500">Next 7 days, times in America/Los_Angeles.</p>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          Could not load your schedule. Try again later.
        </p>
      ) : (
        days.map((day) => (
          <section key={day.date} aria-labelledby={`day-${day.date}`} className="flex flex-col gap-2">
            <h2 id={`day-${day.date}`} className="text-lg font-medium">
              {day.date}
            </h2>
            {day.slots.length === 0 ? (
              <p className="text-sm text-zinc-500">No slots on this day.</p>
            ) : (
              <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                {day.slots.map((slot) => (
                  <li key={slot.start.toISOString()} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-mono">{slot.time}</span>
                    <span className="flex flex-wrap items-center gap-3">
                      {slot.clientName ? <span>{slot.clientName}</span> : null}
                      {slot.heldUntil ? (
                        <span className="text-zinc-500">Held until {formatPracticeTime(slot.heldUntil)}</span>
                      ) : null}
                      <span className="rounded border px-2 py-0.5 text-xs">{slot.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </main>
  );
}
