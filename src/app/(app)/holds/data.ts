import type { createClient } from "@/lib/supabase/server";
import { holdsList, toHoldRecord, type HoldListItem } from "@/lib/slots";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Скільки утримань майбутніх слотів читаємо за раз.
// shortcut: 500 записів, далі — сторінки, якщо практика матиме більше утримань наперед.
export const HOLDS_LIMIT = 500;

// Дані /holds (AC-HOLD-20, 28, 29, 37, 38, 42, 43): утримання слотів, що ще не почалися, з клієнтом і терапевтом;
// що показати — вирішує holdsList. Підтверджені теж читаємо: пізніше підтверджене утримання того самого клієнта
// ховає його прострочене (AC-HOLD-37), а саме в список не потрапляє (AC-HOLD-38).
// RLS: admin і scheduler бачать усі утримання й профілі терапевтів.
export async function loadHolds(supabase: ServerClient, now: Date): Promise<{ holds: HoldListItem[]; error: boolean }> {
  const holds = await supabase
    .from("holds")
    .select(
      "id, therapist_id, client_id, slot_start, created_at, confirmed_at, clients(full_name), therapist:profiles!holds_therapist_id_fkey(full_name, email)",
    )
    .gt("slot_start", now.toISOString())
    .order("slot_start")
    .limit(HOLDS_LIMIT);
  if (holds.error) return { holds: [], error: true };

  const records = holds.data.map((row) => ({
    ...toHoldRecord(row),
    clientId: row.client_id,
    therapistId: row.therapist_id,
    therapistName: row.therapist?.full_name ?? row.therapist?.email ?? "Unknown therapist",
  }));
  return { holds: holdsList(records, now), error: false };
}
