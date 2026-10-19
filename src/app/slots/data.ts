import type { createClient } from "@/lib/supabase/server";
import {
  addDays,
  buildDaySlots,
  isoWeekday,
  isPracticeDate,
  practiceDate,
  practiceTimeToUtc,
  type DaySlot,
} from "@/lib/slots";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type Therapist = { id: string; name: string; email: string };

export type DayView = {
  therapists: Therapist[];
  therapist: Therapist | null;
  date: string;
  slots: DaySlot[];
  error: boolean;
};

// Дані сторінки /slots: терапевти, доступність вибраного дня й утримання цього дня (AC-HOLD-01, 05, 06, 18).
// RLS: admin і scheduler бачать профілі терапевтів і всі утримання.
export async function loadDayView(
  supabase: ServerClient,
  params: { therapist?: string; date?: string },
): Promise<DayView> {
  const now = new Date();
  const date = isPracticeDate(params.date) ? params.date : practiceDate(now);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "therapist")
    .order("full_name");

  const therapists: Therapist[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.email ?? p.id,
    email: p.email ?? "",
  }));
  const therapist = therapists.find((t) => t.id === params.therapist) ?? therapists[0] ?? null;

  if (profilesError || !therapist) {
    return { therapists, therapist, date, slots: [], error: Boolean(profilesError) };
  }

  const dayStart = practiceTimeToUtc(date, 0).toISOString();
  const dayEnd = practiceTimeToUtc(addDays(date, 1), 0).toISOString();

  const [availability, holds] = await Promise.all([
    supabase
      .from("therapist_availability")
      .select("start_hour, end_hour")
      .eq("therapist_email", therapist.email)
      .eq("weekday", isoWeekday(date)),
    supabase
      .from("holds")
      .select("id, slot_start, created_at, confirmed_at, clients(full_name)")
      .eq("therapist_id", therapist.id)
      .gte("slot_start", dayStart)
      .lt("slot_start", dayEnd),
  ]);

  if (availability.error || holds.error) {
    return { therapists, therapist, date, slots: [], error: true };
  }

  const slots = buildDaySlots({
    date,
    availability: availability.data,
    holds: holds.data.map((h) => ({
      id: h.id,
      slotStart: new Date(h.slot_start),
      createdAt: new Date(h.created_at),
      confirmedAt: h.confirmed_at ? new Date(h.confirmed_at) : null,
      clientName: h.clients?.full_name ?? "—",
    })),
    now,
  });

  return { therapists, therapist, date, slots, error: false };
}
