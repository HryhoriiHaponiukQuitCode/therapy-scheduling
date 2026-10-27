import type { createClient } from "@/lib/supabase/server";
import { childGuardianLabel, CLIENT_OPTIONS_LIMIT, CLIENT_SEARCH_MAX, clientSearchFilter } from "@/lib/clients";
import {
  addDays,
  buildDaySlots,
  isoWeekday,
  isPracticeDate,
  practiceDate,
  practiceTimeToUtc,
  type DaySlot,
  type HoldRow,
  toHoldRecord,
} from "@/lib/slots";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type Therapist = { id: string; name: string; email: string };
export type ClientOption = { id: string; name: string; guardianEmail: string | null };

// Клієнти для вибору під час утримання (AC-HOLD-10); порядок задає запит (.order("full_name")).
// Біля дитини показуємо email опікуна (AC-CARD-02), тож він їде в опцію.
export function toClientOptions(
  rows: { id: string; full_name: string; client_type: string; guardian_email: string | null }[],
): ClientOption[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.full_name,
    guardianEmail: row.client_type === "child" ? row.guardian_email : null,
  }));
}

// Клієнти для утримання: усі або ті, чиє ім'я, email чи email опікуна містять q (RLS: admin і scheduler бачать усіх).
// Не більше CLIENT_OPTIONS_LIMIT; на один рядок більше — щоб знати, що є ще.
function clientsQuery(supabase: ServerClient, q: string) {
  const query = supabase
    .from("clients")
    .select("id, full_name, client_type, guardian_email")
    .order("full_name")
    .limit(CLIENT_OPTIONS_LIMIT + 1);
  const filter = clientSearchFilter(q);
  return filter ? query.or(filter) : query;
}

// Варіанти Select «Client to hold a slot for»: біля дитини — email опікуна (AC-CARD-02).
export function toSelectOptions(clients: ClientOption[]): { value: string; label: string; hint?: string }[] {
  return clients.map((client) => ({
    value: client.id,
    label: client.name,
    hint: client.guardianEmail ? childGuardianLabel(client.guardianEmail) : undefined,
  }));
}

export type TherapistDay = { therapist: Therapist; slots: DaySlot[] };

// Утримання одного терапевта з рядків запиту на кількох.
function recordsOf(rows: (HoldRow & { therapist_id: string })[], therapistId: string) {
  return rows.filter((row) => row.therapist_id === therapistId).map(toHoldRecord);
}

export type DayView = {
  therapists: Therapist[];
  selected: Therapist[];
  date: string;
  today: string; // «сьогодні» в America/Los_Angeles — для Calendar
  days: TherapistDay[]; // колонка на кожного вибраного терапевта, у порядку списку
  q: string; // пошук клієнта для утримання (AC-CARD-02)
  clients: ClientOption[];
  clientsTruncated: boolean; // знайдено більше за CLIENT_OPTIONS_LIMIT — показано перших
  clientsError: boolean;
  error: boolean;
};

// Скільки колонок показати, коли терапевтів не вибрано: перший екран лишається читабельним і для великої практики.
export const DEFAULT_THERAPIST_COLUMNS = 4;

// Вибрані терапевти з GET-параметра therapist (можна кілька): у порядку списку; без вибору чи лише з
// невідомими id — перші DEFAULT_THERAPIST_COLUMNS терапевтів.
export function selectTherapists(therapists: Therapist[], ids: string[]): Therapist[] {
  const chosen = therapists.filter((t) => ids.includes(t.id));
  return chosen.length > 0 ? chosen : therapists.slice(0, DEFAULT_THERAPIST_COLUMNS);
}

// Дані сторінки /slots: терапевти, доступність вибраного дня й утримання кожного вибраного терапевта, клієнти
// для утримання (AC-HOLD-01, 05, 06, 18, 24, 32, 33; AC-HOLD-10 — вибір клієнта). Список утримань — /holds.
// Запити — по одному на всіх вибраних (in), далі групуємо за терапевтом.
// RLS: admin і scheduler бачать профілі терапевтів і всі утримання.
export async function loadDayView(
  supabase: ServerClient,
  params: { therapists: string[]; date?: string; q?: string },
): Promise<DayView> {
  const now = new Date();
  const date = isPracticeDate(params.date) ? params.date : practiceDate(now);
  const today = practiceDate(now);
  // Один раз обрізаний q — і для запиту, і для поля, прихованих параметрів та повідомлень.
  const q = (params.q ?? "").trim().slice(0, CLIENT_SEARCH_MAX).trim();

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
  const selected = selectTherapists(therapists, params.therapists);
  const empty = { therapists, selected, date, today, days: [], q, clients: [], clientsTruncated: false, clientsError: false };

  if (profilesError || selected.length === 0) {
    return { ...empty, error: Boolean(profilesError) };
  }

  const ids = selected.map((t) => t.id);
  const dayStart = practiceTimeToUtc(date, 0).toISOString();
  const dayEnd = practiceTimeToUtc(addDays(date, 1), 0).toISOString();

  const [availability, holds, clients] = await Promise.all([
    supabase
      .from("therapist_availability")
      .select("therapist_email, start_hour, end_hour")
      .in("therapist_email", selected.map((t) => t.email))
      .eq("weekday", isoWeekday(date)),
    supabase
      .from("holds")
      .select("id, therapist_id, slot_start, created_at, confirmed_at, clients(full_name)")
      .in("therapist_id", ids)
      .gte("slot_start", dayStart)
      .lt("slot_start", dayEnd),
    clientsQuery(supabase, q),
  ]);

  // Без клієнтів не працює лише вибір для утримання — статуси слотів однаково показуємо.
  if (availability.error || holds.error) {
    return { ...empty, error: true };
  }

  const days: TherapistDay[] = selected.map((therapist) => ({
    therapist,
    slots: buildDaySlots({
      date,
      availability: availability.data.filter((row) => row.therapist_email === therapist.email),
      holds: recordsOf(holds.data, therapist.id),
      now,
    }),
  }));

  return {
    therapists,
    selected,
    date,
    today,
    days,
    q,
    clients: clients.error ? [] : toClientOptions(clients.data.slice(0, CLIENT_OPTIONS_LIMIT)),
    clientsTruncated: !clients.error && clients.data.length > CLIENT_OPTIONS_LIMIT,
    clientsError: Boolean(clients.error),
    error: false,
  };
}
