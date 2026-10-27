// Картка клієнта з анкети (openspec/specs/clients/spec.md, client-access/spec.md).
// Тексти повідомлень — дослівно з вимог PM. Ті самі правила повторює база (міграції 20261019102511_roles_and_clients.sql
// і 20261027190554_client_cards.sql): constraint, тригер нової картки, унікальні індекси — вони остаточні.
import { isPracticeDate } from "@/lib/slots";

export const CLIENT_INVALID_MESSAGE = "Enter the client's name and a valid email."; // AC-HOLD-11, 15, 39, 41
export const CLIENT_DUPLICATE_MESSAGE = "A client with this email already exists."; // AC-HOLD-16, 34
export const CHILD_DUPLICATE_MESSAGE = "A client with these details already exists."; // AC-CARD-13
export const CLIENT_FORBIDDEN_MESSAGE = "Only schedulers and admins can create client cards."; // AC-CARD-06
export const CLIENT_TYPE_MESSAGE = "Select a client type.";
export const CHILD_NAME_MESSAGE = "Enter the client's name."; // AC-CARD-12
export const BIRTH_DATE_MESSAGE = "Enter a date of birth that is not in the future."; // AC-CARD-12
export const LANGUAGE_MESSAGE = "Select a session language."; // AC-CARD-12
export const GUARDIAN_MESSAGE = "Enter the guardian's name and a valid email."; // AC-CARD-03

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Ті самі межі, що clients_*_length у міграціях.
export const CLIENT_NAME_MAX = 200;
export const CLIENT_EMAIL_MAX = 254;

export const CLIENT_TYPES = ["adult", "child"] as const;
export const SESSION_LANGUAGES = ["English", "Spanish"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export type SessionLanguage = (typeof SESSION_LANGUAGES)[number];

// Поля форми — імена полів <form> і ключі помилок біля полів.
export type ClientCardField =
  | "client_type"
  | "full_name"
  | "birth_date"
  | "session_language"
  | "email"
  | "guardian_name"
  | "guardian_email";

export type ClientCardValues = Record<ClientCardField, string>;
export type ClientCardErrors = Partial<Record<ClientCardField, string>>;

export type ClientCardInsert = {
  client_type: ClientType;
  full_name: string;
  birth_date: string;
  session_language: SessionLanguage;
  email: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
};

export type ClientCardValidation =
  | { ok: true; value: ClientCardInsert }
  | { ok: false; errors: ClientCardErrors };

export const EMPTY_CLIENT_CARD: ClientCardValues = {
  client_type: "",
  full_name: "",
  birth_date: "",
  session_language: "",
  email: "",
  guardian_name: "",
  guardian_email: "",
};

// AC-HOLD-35: email малими літерами без пробілів по краях; null — некоректний.
function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= CLIENT_EMAIL_MAX && EMAIL_PATTERN.test(email) ? email : null;
}

// AC-HOLD-41: ім'я без пробілів по краях; лише з пробілів — порожнє (null).
function normalizeName(value: string): string | null {
  const name = value.trim();
  return name && name.length <= CLIENT_NAME_MAX ? name : null;
}

// Усі помилки полів одразу, кожна біля свого поля (AC-CARD-12); today — календарний день практики (РРРР-ММ-ДД),
// дата народження, що дорівнює йому, коректна.
export function validateClientCard(values: ClientCardValues, today: string): ClientCardValidation {
  const errors: ClientCardErrors = {};
  const type = (CLIENT_TYPES as readonly string[]).includes(values.client_type)
    ? (values.client_type as ClientType)
    : null;
  if (!type) errors.client_type = CLIENT_TYPE_MESSAGE;

  const fullName = normalizeName(values.full_name);
  const birthDate = values.birth_date.trim();
  if (!isPracticeDate(birthDate) || birthDate > today) errors.birth_date = BIRTH_DATE_MESSAGE;
  const language = (SESSION_LANGUAGES as readonly string[]).includes(values.session_language)
    ? (values.session_language as SessionLanguage)
    : null;
  if (!language) errors.session_language = LANGUAGE_MESSAGE;

  let email: string | null = null;
  let guardianName: string | null = null;
  let guardianEmail: string | null = null;
  if (type === "adult") {
    // AC-HOLD-11, 15, 39, 41: ім'я або email дорослого — одне повідомлення PM біля поля, якого воно стосується.
    email = normalizeEmail(values.email);
    if (!fullName) errors.full_name = CLIENT_INVALID_MESSAGE;
    if (!email) errors.email = CLIENT_INVALID_MESSAGE;
  } else {
    if (!fullName) errors.full_name = CHILD_NAME_MESSAGE;
    if (type === "child") {
      // AC-CARD-03: ім'я та email опікуна; для email опікуна — лише правило коректного email (#22).
      guardianName = normalizeName(values.guardian_name);
      guardianEmail = normalizeEmail(values.guardian_email);
      if (!guardianName) errors.guardian_name = GUARDIAN_MESSAGE;
      if (!guardianEmail) errors.guardian_email = GUARDIAN_MESSAGE;
    }
  }

  if (Object.keys(errors).length > 0 || !type || !fullName || !language) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      client_type: type,
      full_name: fullName,
      birth_date: birthDate,
      session_language: language,
      email,
      guardian_name: guardianName,
      guardian_email: guardianEmail,
    },
  };
}

// Помилка insert у clients → текст PM. 23505 розрізняємо за назвою унікального індексу; 23514 (constraint чи тригер
// clients_before_insert) після validateClientCard не очікуємо — загальний текст.
const UNIQUE_VIOLATION = "23505";
const INSUFFICIENT_PRIVILEGE = "42501"; // RLS clients_insert_staff

export function clientInsertErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code === UNIQUE_VIOLATION) {
    return error.message?.includes("clients_child_identity_key") ? CHILD_DUPLICATE_MESSAGE : CLIENT_DUPLICATE_MESSAGE;
  }
  if (error.code === INSUFFICIENT_PRIVILEGE) return CLIENT_FORBIDDEN_MESSAGE;
  return "Could not create the client. Try again.";
}

// ── Список і картка за роллю (client-access/spec.md) ─────────────────────────
export const NO_CLIENTS_STAFF_MESSAGE = "No clients yet. Create a client card from an intake form."; // AC-CARD-15
export const NO_CLIENTS_THERAPIST_MESSAGE =
  "No clients yet. Clients appear here when a scheduler holds a slot with you."; // AC-CARD-09
export const CLIENT_NOT_FOUND_MESSAGE = "This client card doesn't exist."; // AC-CARD-16
export const CLIENT_NO_ACCESS_MESSAGE = "You don't have access to this client."; // AC-CARD-05, 08, 14, 16
export const NOT_PROVIDED = "Not provided"; // поля карток зрізу 1

type CardViewerRole = "admin" | "scheduler" | "therapist";

// Порожній список: різний текст для терапевта й для планувальника чи адміністратора.
export function emptyClientsMessage(role: CardViewerRole): string {
  return role === "therapist" ? NO_CLIENTS_THERAPIST_MESSAGE : NO_CLIENTS_STAFF_MESSAGE;
}

// Картку не видно (RLS не повернула рядок): планувальнику й адміністратору — «не існує»; терапевту — те саме, що й для
// чужої картки, щоб за відповіддю не можна було дізнатися, які картки існують (AC-CARD-16).
export function missingCardMessage(role: CardViewerRole): string {
  return role === "therapist" ? CLIENT_NO_ACCESS_MESSAGE : CLIENT_NOT_FOUND_MESSAGE;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Посилання з не-UUID — картки точно немає (без запиту, який упав би з 22P02).
export function isClientId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// ── Пошук клієнта під час утримання на /slots (design.md → Auth, AC-CARD-02) ──
export const CLIENT_SEARCH_MAX = 100;

// Умова для PostgREST .or(): ім'я, email або email опікуна містять q без урахування регістру. Значення в лапках, бо
// кома, дужки й двокрапка — службові символи or(); лапки й зворотний слеш екрануємо. Порожній q — без фільтра.
// shortcut: % і _ у q лишаються шаблонами ilike (знайде трохи більше), екранувати — якщо пошук почне плутати.
export function clientSearchFilter(q: string): string | null {
  const term = q.trim().slice(0, CLIENT_SEARCH_MAX);
  if (!term) return null;
  const value = `"*${term.replace(/[\\"]/g, (char) => `\\${char}`)}*"`;
  return ["full_name", "email", "guardian_email"].map((column) => `${column}.ilike.${value}`).join(",");
}

// Пошук нічого не знайшов. Власне формулювання: PM тексту не задав.
export function noClientMatchMessage(q: string): string {
  return `No clients match "${q.trim()}".`;
}
