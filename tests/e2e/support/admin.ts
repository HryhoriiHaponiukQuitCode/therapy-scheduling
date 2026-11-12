// Синтетичні дані UAT і прибирання за ними — секретним ключем Supabase (обходить RLS).
// Лише в тестах і лише на машині розробника (.env.local) або в CI на одноразовому локальному стеку (e2e.yml).
// У GitHub Secrets SUPABASE_SECRET_KEY не додаємо. Без ключа (прогін лише AC, що нічого не пишуть,
// --grep-invert '@writes') цей файл нічого не робить: cleanup.teardown.ts не реєструє тест.
// check:boundary сканує src/, тож цей файл його не порушує; у src/ секретний ключ читає лише src/lib/supabase/admin.ts.
// Ніколи не друкуємо значення ключів і паролів — лише адреси синтетичних користувачів.
//
// Джерело: демо-репо курсу, tests/e2e/support/admin.ts (тег ws8-03-uat). Демо-специфічні помічники (createEmployee
// з підрозділом і посадою, isBlockedDay, leaveRequestsOf) прибрано — подивіться їх у демо як зразок для своїх.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addDays, isoWeekday, practiceDate, practiceTimeToUtc } from "../../../src/lib/slots";

/**
 * ВАШЕ: рядки синтетичного користувача, які треба видалити ДО deleteUser, — таблиці з FK на користувача без
 * on delete cascade (інакше Auth відповідає «Database error deleting user»). У демо: leave_requests.employee_id.
 * Якщо таких таблиць немає (або всі FK — cascade), лишіть порожнім.
 */
const OWNED_ROWS: { table: string; column: string }[] = [];

/** Лише такі адреси прибирання має право видалити: uat-<run>[-<суфікс>]@example.test. */
export const UAT_EMAIL = /^uat-[0-9a-z-]+@example\.test$/;

export function uatEmail(suffix?: string): string {
  const run = process.env.UAT_RUN ?? "manual";
  const email = `uat-${run}${suffix ? `-${suffix}` : ""}@example.test`;
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична адреса має вигляд uat-…@example.test, а не ${email}`);
  return email;
}

export const randomPassword = () => `Uat-${randomBytes(12).toString("base64url")}`;

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** Клієнт із секретним ключем — для ваших помічників синтетичних даних (створити користувача, прочитати рядок). */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Для синтетичних даних UAT потрібні NEXT_PUBLIC_SUPABASE_URL і SUPABASE_SECRET_KEY (.env.local)");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listUatUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && UAT_EMAIL.test(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

const CLEANUP_LOG = "test-results/uat-cleanup.jsonl";

/** Усі uat-адреси, які видалив цей прогін (за журналом). */
export function deletedThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { deleted: string[] });
  return [...new Set(entries.flatMap((e) => e.deleted))];
}

/** leftoverRequests — скільки рядків видалених користувачів лишилось у таблицях OWNED_ROWS (назва поля — з демо). */
export type CleanupResult = { deleted: string[]; remaining: string[]; leftoverRequests: number };

/**
 * Видаляє ВСІХ uat-*@example.test (і тих, що лишились після обірваних прогонів), а потім перевіряє:
 * жодного такого користувача й жодного їхнього рядка в OWNED_ROWS.
 */
export async function deleteUatUsers(onlyEmail?: string): Promise<CleanupResult> {
  const supabase = adminClient();
  const targets = (await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail);
  const deleted: string[] = [];
  for (const u of targets) {
    for (const { table, column } of OWNED_ROWS) {
      const { error: rowsError } = await supabase.from(table).delete().eq(column, u.id);
      if (rowsError) throw rowsError;
    }
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw error;
    deleted.push(u.email);
  }
  const remaining = (await listUatUsers(supabase))
    .filter((u) => !onlyEmail || u.email === onlyEmail)
    .map((u) => u.email);
  let leftoverRequests = 0;
  for (const { table, column } of targets.length ? OWNED_ROWS : []) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(
        column,
        targets.map((u) => u.id),
      );
    if (error) throw error;
    leftoverRequests += count ?? 0;
  }
  // Журнал прибирань прогону: afterAll специфікацій і teardown (Playwright чистить test-results/ на старті прогону).
  mkdirSync("test-results", { recursive: true });
  appendFileSync(
    CLEANUP_LOG,
    `${JSON.stringify({ at: new Date().toISOString(), scope: onlyEmail ?? "uat-*", deleted, remaining, leftoverRequests })}\n`,
  );
  return { deleted, remaining, leftoverRequests };
}

// ── Зріз 3 (статус страхування): синтетичні картки клієнтів і утримання для «Дано» ────────────────────────────
// Картки клієнтів UAT мають email uat-<run>-<суфікс>@example.test (uatEmail): так прибирання знаходить їх і після
// обірваних прогонів. Утримання видаляються разом з карткою (holds.client_id … on delete cascade).

/** Картки клієнтів UAT: лише такі email прибирання має право видалити. */
const UAT_CLIENT_EMAIL = "uat-%@example.test";

async function profileId(supabase: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("id").eq("email", email).single();
  if (error) throw error;
  return data.id as string;
}

/**
 * «Дано»: картка дорослого клієнта від імені scheduler1 (created_by) з потрібним статусом страхування.
 * Статус ставимо секретним ключем — так «Дано» не залежить від дії, яку перевіряє тест.
 */
export async function createUatClient(opts: {
  suffix: string;
  name: string;
  insuranceStatus?: "not_set" | "verified" | "not_accepted" | "private_pay";
}): Promise<{ id: string; email: string; name: string }> {
  const supabase = adminClient();
  const email = uatEmail(opts.suffix);
  const { data, error } = await supabase
    .from("clients")
    .insert({
      client_type: "adult",
      full_name: opts.name,
      email,
      birth_date: "1990-05-14",
      session_language: "English",
      created_by: await profileId(supabase, "scheduler1@example.test"),
    })
    .select("id")
    .single();
  if (error) throw error;
  if (opts.insuranceStatus && opts.insuranceStatus !== "not_set") {
    const { error: statusError } = await supabase
      .from("clients")
      .update({ insurance_status: opts.insuranceStatus })
      .eq("id", data.id);
    if (statusError) throw statusError;
  }
  return { id: data.id as string, email, name: opts.name };
}

/** Статус страхування картки в базі (секретним ключем) — для перевірок «що не змінилося». */
export async function insuranceStatusOf(clientId: string): Promise<string> {
  const { data, error } = await adminClient().from("clients").select("insurance_status").eq("id", clientId).single();
  if (error) throw error;
  return data.insurance_status as string;
}

/**
 * Клієнт Supabase від імені синтетичного користувача (вхід паролем акаунта з supabase/demo-users.json) — запити
 * «напряму, оминаючи сторінки застосунку», з правами й RLS цього користувача. Пароль — лише зі змінних середовища.
 */
export async function userClient(email: string): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const role = email.split("@")[0];
  const password = process.env[`UAT_PASSWORD_${role.toUpperCase()}`] ?? process.env.DEMO_USER_PASSWORD;
  if (!url || !key || !password) {
    throw new Error(`Для входу ${email} потрібні NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY і пароль`);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Вхід ${email} не вдався: ${error.message}`);
  return supabase;
}

/**
 * «Дано»: scheduler1 утримує за клієнтом найближчий вільний слот терапевта («Held», без підтвердження) — тією самою
 * функцією hold_slot, що й сторінка /slots, тож правила утримання ті самі. Слоти — будні 09:00–16:00 часу практики,
 * від двох тижнів уперед у межах 8 тижнів доступності; зайнятий слот (SLOT_UNAVAILABLE) пропускаємо.
 */
export async function holdForTherapist(clientId: string, therapistEmail: string): Promise<string> {
  const therapistId = await profileId(adminClient(), therapistEmail);
  const scheduler = await userClient("scheduler1@example.test");
  try {
    const today = practiceDate(new Date());
    for (let day = 14; day <= 50; day++) {
      const date = addDays(today, day);
      if (isoWeekday(date) > 5) continue;
      for (let hour = 16; hour >= 9; hour--) {
        const slot = practiceTimeToUtc(date, hour).toISOString();
        const { error } = await scheduler.rpc("hold_slot", {
          p_therapist_id: therapistId,
          p_slot_start: slot,
          p_client_id: clientId,
        });
        if (!error) return slot;
        if (!/SLOT_UNAVAILABLE/.test(error.message)) throw error;
      }
    }
    throw new Error(`У ${therapistEmail} немає вільного слоту на 2–7 тижнів уперед`);
  } finally {
    await scheduler.auth.signOut();
  }
}

export type ClientsCleanupResult = { deleted: string[]; remaining: string[] };

/** Видаляє ВСІ картки клієнтів UAT (разом з їхніми утриманнями) і перевіряє, що жодної не лишилось. */
export async function deleteUatClients(): Promise<ClientsCleanupResult> {
  const supabase = adminClient();
  const { data, error } = await supabase.from("clients").delete().like("email", UAT_CLIENT_EMAIL).select("email");
  if (error) throw error;
  const { data: left, error: leftError } = await supabase.from("clients").select("email").like("email", UAT_CLIENT_EMAIL);
  if (leftError) throw leftError;
  const result = { deleted: data.map((r) => r.email as string), remaining: left.map((r) => r.email as string) };
  mkdirSync("test-results", { recursive: true });
  appendFileSync(CLEANUP_LOG, `${JSON.stringify({ at: new Date().toISOString(), scope: "clients uat-*", deleted: [], clients: result })}\n`);
  return result;
}

/** Усі картки клієнтів UAT, які видалив цей прогін (за журналом). */
export function deletedClientsThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { clients?: ClientsCleanupResult });
  return [...new Set(entries.flatMap((e) => e.clients?.deleted ?? []))];
}
