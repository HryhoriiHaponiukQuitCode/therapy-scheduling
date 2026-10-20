import type { createClient } from "@/lib/supabase/server";
import {
  addDays,
  buildDaySlots,
  isoWeekday,
  practiceDate,
  practiceTimeToUtc,
  toHoldRecord,
  type DaySlot,
} from "@/lib/slots";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const SCHEDULE_DAYS = 7;

export type ScheduleDay = { date: string; slots: DaySlot[] };

// Розклад терапевта на 7 днів від сьогодні (AC-HOLD-09; період — власне припущення з docs/spec-reading.md).
// Лише власні слоти й утримання: фільтр за власним id та email і RLS (holds_select_own_therapist).
// Прострочені утримання не показуються, їхні слоти — вільні (AC-HOLD-21, buildDaySlots).
export async function loadMySchedule(
  supabase: ServerClient,
  user: { id: string; email: string },
  now: Date,
): Promise<{ days: ScheduleDay[]; error: boolean }> {
  const today = practiceDate(now);
  const from = practiceTimeToUtc(today, 0).toISOString();
  const to = practiceTimeToUtc(addDays(today, SCHEDULE_DAYS), 0).toISOString();

  const [availability, holds] = await Promise.all([
    supabase
      .from("therapist_availability")
      .select("weekday, start_hour, end_hour")
      // Без урахування регістру, як у RLS і hold_slot; % і _ екрануємо, щоб ilike був точним збігом.
      .ilike("therapist_email", user.email.replace(/[\\%_]/g, (ch) => `\\${ch}`)),
    supabase
      .from("holds")
      .select("id, slot_start, created_at, confirmed_at, clients(full_name)")
      .eq("therapist_id", user.id)
      .gte("slot_start", from)
      .lt("slot_start", to),
  ]);

  if (availability.error || holds.error) {
    return { days: [], error: true };
  }

  const records = holds.data.map(toHoldRecord);

  const days = Array.from({ length: SCHEDULE_DAYS }, (_, i) => {
    const date = addDays(today, i);
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

  return { days, error: false };
}
