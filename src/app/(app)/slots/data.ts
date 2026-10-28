import type { createClient } from "@/lib/supabase/server";
import {
  childGuardianLabel,
  CLIENT_OPTIONS_LIMIT,
  CLIENT_SEARCH_MAX,
  clientSearchFilter,
  MORE_CLIENTS_MESSAGE,
  noClientMatchMessage,
} from "@/lib/clients";
import type { SelectOption } from "@/components/ui/select";
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

export type ClientSearch = { q: string; clients: ClientOption[]; truncated: boolean; error: boolean };
const NO_CLIENTS: ClientSearch = { q: "", clients: [], truncated: false, error: false };

// Клієнти для утримання: усі або ті, чиє ім'я, email чи email опікуна містять q (AC-CARD-02; RLS: admin і scheduler
// бачать усіх). Не більше CLIENT_OPTIONS_LIMIT; на один рядок більше — щоб знати, що є ще. q обрізаємо один раз:
// той самий текст іде і в запит, і в повідомлення «нічого не знайдено».
export async function searchClients(supabase: ServerClient, rawQ: string): Promise<ClientSearch> {
  const q = rawQ.trim().slice(0, CLIENT_SEARCH_MAX).trim();
  const query = supabase
    .from("clients")
    .select("id, full_name, client_type, guardian_email")
    .order("full_name")
    .limit(CLIENT_OPTIONS_LIMIT + 1);
  const filter = clientSearchFilter(q);
  const { data, error } = await (filter ? query.or(filter) : query);
  if (error) return { q, clients: [], truncated: false, error: true };
  return {
    q,
    clients: toClientOptions(data.slice(0, CLIENT_OPTIONS_LIMIT)),
    truncated: data.length > CLIENT_OPTIONS_LIMIT,
    error: false,
  };
}

// Що бачить поле вибору клієнта: варіанти й підказка під ними (нічого не знайдено / показано не всіх) або помилка.
export type ClientChoices = { options: SelectOption[]; notice: string | null; error: string | null };

export const CLIENTS_ERROR_MESSAGE = "Could not load clients, so slots cannot be held right now.";

export function toClientChoices(search: ClientSearch): ClientChoices {
  if (search.error) return { options: [], notice: null, error: CLIENTS_ERROR_MESSAGE };
  const notice =
    search.clients.length === 0
      ? search.q
        ? noClientMatchMessage(search.q)
        : null
      : search.truncated
        ? MORE_CLIENTS_MESSAGE
        : null;
  return { options: toSelectOptions(search.clients), notice, error: null };
}

// Варіанти Select «Client to hold a slot for»: біля дитини — email опікуна (AC-CARD-02).
export function toSelectOptions(clients: ClientOption[]): SelectOption[] {
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
  // Перші клієнти для вибору під час утримання; далі пошук у самому полі (findClients, AC-CARD-02).
  clients: ClientSearch;
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

// Терапевти за іменем (RLS: admin і scheduler бачать їхні профілі); ім'я — full_name, інакше email чи id.
// Спільне для /slots і статистики головної.
export async function loadTherapists(supabase: ServerClient): Promise<{ therapists: Therapist[]; error: boolean }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "therapist")
    .order("full_name");
  return {
    therapists: (data ?? []).map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? p.id, email: p.email ?? "" })),
    error: Boolean(error),
  };
}

// Дані сторінки /slots: терапевти, доступність вибраного дня й утримання кожного вибраного терапевта, клієнти
// для утримання (AC-HOLD-01, 05, 06, 18, 24, 32, 33; AC-HOLD-10 — вибір клієнта). Список утримань — /holds.
// Запити — по одному на всіх вибраних (in), далі групуємо за терапевтом.
// RLS: admin і scheduler бачать профілі терапевтів і всі утримання.
export async function loadDayView(
  supabase: ServerClient,
  params: { therapists: string[]; date?: string },
): Promise<DayView> {
  const now = new Date();
  const date = isPracticeDate(params.date) ? params.date : practiceDate(now);
  const today = practiceDate(now);

  const { therapists, error: profilesError } = await loadTherapists(supabase);
  const selected = selectTherapists(therapists, params.therapists);
  const empty = { therapists, selected, date, today, days: [], clients: NO_CLIENTS };

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
    searchClients(supabase, ""),
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
    clients,
    error: false,
  };
}
