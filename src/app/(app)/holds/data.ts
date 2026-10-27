import type { createClient } from "@/lib/supabase/server";
import { holdsList, toHoldRecord, type HoldListItem } from "@/lib/slots";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Скільки непідтверджених утримань майбутніх слотів читаємо за раз.
// shortcut: 500 записів, далі — сторінки, якщо практика матиме більше утримань наперед.
export const HOLDS_LIMIT = 500;

// Дані /holds (AC-HOLD-20, 28, 29, 37, 38, 42, 43): непідтверджені утримання слотів, що ще не почалися, з клієнтом і
// терапевтом; що показати — вирішує holdsList. RLS: admin і scheduler бачать усі утримання й профілі терапевтів.
export async function loadHolds(supabase: ServerClient, now: Date): Promise<{ holds: HoldListItem[]; error: boolean }> {
  const [holds, therapists] = await Promise.all([
    supabase
      .from("holds")
      .select("id, therapist_id, client_id, slot_start, created_at, confirmed_at, clients(full_name)")
      .is("confirmed_at", null)
      .gt("slot_start", now.toISOString())
      .order("slot_start")
      .limit(HOLDS_LIMIT),
    supabase.from("profiles").select("id, full_name, email").eq("role", "therapist"),
  ]);
  if (holds.error || therapists.error) return { holds: [], error: true };

  const names = new Map(therapists.data.map((t) => [t.id, t.full_name ?? t.email ?? t.id]));
  const records = holds.data.map((row) => ({
    ...toHoldRecord(row),
    clientId: row.client_id,
    therapistId: row.therapist_id,
    therapistName: names.get(row.therapist_id) ?? "—",
  }));
  return { holds: holdsList(records, now), error: false };
}
