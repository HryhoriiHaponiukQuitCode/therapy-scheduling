import type { createClient } from "@/lib/supabase/server";
import { isStaff, type AppRole } from "@/lib/roles";
import { addDays, holdRecord, practiceDate, practiceTimeToUtc, toHoldRecord } from "@/lib/slots";
import { scheduleStats, STATS_DAYS, type ScheduleStats } from "@/lib/stats";
import { ownAvailability } from "./my-schedule/data";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Статистика головної на STATS_DAYS днів (scheduleStats). Адміністратор і планувальник бачать усю практику з розбивкою
// за терапевтами (RLS: їм видно профілі терапевтів, доступність і всі утримання); терапевт — лише власний розклад, як
// на /my-schedule (функція my_schedule). null — запит не вдався.
export async function loadHomeStats(
  supabase: ServerClient,
  user: { id: string; email: string | null; role: AppRole },
  now: Date,
): Promise<ScheduleStats | null> {
  const from = practiceDate(now);
  const to = addDays(from, STATS_DAYS);

  if (!isStaff(user.role)) {
    if (!user.email) return null;
    const [availability, holds] = await Promise.all([
      ownAvailability(supabase, user.email),
      supabase.rpc("my_schedule", { p_from: from, p_to: to }),
    ]);
    if (availability.error || holds.error) return null;
    return scheduleStats(
      [
        {
          id: user.id,
          name: user.email,
          availability: availability.data,
          holds: holds.data.map((row) => holdRecord(row, row.client_name)),
        },
      ],
      now,
    );
  }

  const [profiles, availability, holds] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "therapist").order("full_name"),
    supabase.from("therapist_availability").select("therapist_email, weekday, start_hour, end_hour"),
    supabase
      .from("holds")
      .select("id, therapist_id, slot_start, created_at, confirmed_at, clients(full_name)")
      .gte("slot_start", practiceTimeToUtc(from, 0).toISOString())
      .lt("slot_start", practiceTimeToUtc(to, 0).toISOString()),
  ]);
  if (profiles.error || availability.error || holds.error) return null;

  return scheduleStats(
    profiles.data.map((profile) => ({
      id: profile.id,
      name: profile.full_name ?? profile.email ?? profile.id,
      // Email доступності — без урахування регістру, як у RLS і hold_slot.
      availability: availability.data.filter(
        (row) => row.therapist_email.toLowerCase() === profile.email?.toLowerCase(),
      ),
      holds: holds.data.filter((row) => row.therapist_id === profile.id).map(toHoldRecord),
    })),
    now,
  );
}
