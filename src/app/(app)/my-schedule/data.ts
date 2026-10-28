import type { createClient } from "@/lib/supabase/server";
import {
  addDays,
  buildDaySlots,
  holdRecord,
  isoWeekday,
  isPracticeDate,
  practiceDate,
  type DaySlot,
} from "@/lib/slots";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type ScheduleDay = { date: string; slots: DaySlot[] };

// Доступність терапевта за його email: без урахування регістру, як у RLS і hold_slot; % і _ екрануємо, щоб ilike був
// точним збігом. Спільне для /my-schedule і статистики головної.
export function ownAvailability(supabase: ServerClient, email: string) {
  return supabase
    .from("therapist_availability")
    .select("weekday, start_hour, end_hour")
    .ilike("therapist_email", email.replace(/[\\%_]/g, (ch) => `\\${ch}`));
}

// Понеділок тижня, у який потрапляє дата (тиждень пн–нд, AC-HOLD-30).
export function weekStartOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

// Розклад терапевта на тиждень пн–нд за часом практики (AC-HOLD-30, AC-HOLD-31): поточний або той, у який
// потрапляє GET-параметр week. Утримання й сеанси — функцією my_schedule: лише власні, з іменем клієнта без email
// (AC-HOLD-09, AC-HOLD-40), «Held» — до прострочення, навіть коли слот уже почався (AC-HOLD-42); прострочених
// немає, їхні слоти — вільні або «Past» (AC-HOLD-21, buildDaySlots).
export async function loadMySchedule(
  supabase: ServerClient,
  user: { email: string },
  now: Date,
  week?: string,
): Promise<{ weekStart: string; days: ScheduleDay[]; error: boolean }> {
  const weekStart = weekStartOf(isPracticeDate(week) ? week : practiceDate(now));

  const [availability, holds] = await Promise.all([
    ownAvailability(supabase, user.email),
    supabase.rpc("my_schedule", { p_from: weekStart, p_to: addDays(weekStart, 7) }),
  ]);

  if (availability.error || holds.error) {
    return { weekStart, days: [], error: true };
  }

  const records = holds.data.map((row) => holdRecord(row, row.client_name));

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const weekday = isoWeekday(date);
    return {
      date,
      slots: buildDaySlots({
        date,
        availability: availability.data.filter((a) => a.weekday === weekday),
        holds: records,
        now,
        includeHoldHours: true,
      }),
    };
  });

  return { weekStart, days, error: false };
}
