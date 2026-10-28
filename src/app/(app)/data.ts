import type { createClient } from "@/lib/supabase/server";
import { isStaff, type AppRole } from "@/lib/roles";
import { addDays, holdRecord, practiceDate, practiceTimeToUtc, toHoldRecord } from "@/lib/slots";
import { scheduleStats, STATS_DAYS, type ScheduleStats } from "@/lib/stats";
import { ownAvailability } from "./my-schedule/data";
import { loadTherapists } from "./slots/data";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const HOME_STATS_MESSAGES = {
  ERROR: "Could not load statistics. Try again later.",
  NO_EMAIL: "Your account has no email, so your schedule cannot be shown. Contact an administrator.",
} as const;

export type HomeStats = { stats: ScheduleStats; error: null } | { stats: null; error: string };

// PostgREST віддає не більше max-rows рядків (1000 у Supabase) і решту відкидає без помилки, тож читаємо сторінками
// за стабільним порядком, доки сторінка не неповна. null — запит не вдався.
const PAGE_SIZE = 1000;

async function allRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !data) return null;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

// Статистика головної на STATS_DAYS днів (scheduleStats). Адміністратор і планувальник бачать усю практику з розбивкою
// за терапевтами, як на /slots (RLS: їм видно профілі терапевтів, доступність і всі утримання); терапевт — лише власний
// розклад, як на /my-schedule (функція my_schedule).
export async function loadHomeStats(
  supabase: ServerClient,
  user: { id: string; email: string | null; role: AppRole },
  now: Date,
): Promise<HomeStats> {
  const from = practiceDate(now);
  const to = addDays(from, STATS_DAYS);
  const failed = { stats: null, error: HOME_STATS_MESSAGES.ERROR };

  if (!isStaff(user.role)) {
    // Без email доступність терапевта не знайти, і повтор не допоможе: окреме повідомлення, а не «Try again».
    if (!user.email) return { stats: null, error: HOME_STATS_MESSAGES.NO_EMAIL };
    const [availability, holds] = await Promise.all([
      ownAvailability(supabase, user.email),
      supabase.rpc("my_schedule", { p_from: from, p_to: to }),
    ]);
    if (availability.error || holds.error) return failed;
    const own = {
      id: user.id,
      name: user.email,
      availability: availability.data,
      holds: holds.data.map((row) => holdRecord(row, row.client_name)),
    };
    return { stats: scheduleStats([own], now, { includeHoldHours: true }), error: null };
  }

  const [therapists, availability, holds] = await Promise.all([
    loadTherapists(supabase),
    allRows((a, b) =>
      supabase
        .from("therapist_availability")
        .select("id, therapist_email, weekday, start_hour, end_hour")
        .order("id")
        .range(a, b),
    ),
    allRows((a, b) =>
      supabase
        .from("holds")
        .select("id, therapist_id, slot_start, created_at, confirmed_at, clients(full_name)")
        .gte("slot_start", practiceTimeToUtc(from, 0).toISOString())
        .lt("slot_start", practiceTimeToUtc(to, 0).toISOString())
        .order("id")
        .range(a, b),
    ),
  ]);
  if (therapists.error || !availability || !holds) return failed;

  const stats = scheduleStats(
    therapists.therapists.map((therapist) => ({
      id: therapist.id,
      name: therapist.name,
      // Email доступності — без урахування регістру, як у RLS і hold_slot.
      availability: availability.filter((row) => row.therapist_email.toLowerCase() === therapist.email.toLowerCase()),
      holds: holds.filter((row) => row.therapist_id === therapist.id).map(toHoldRecord),
    })),
    now,
    { includeHoldHours: false },
  );
  return { stats, error: null };
}
