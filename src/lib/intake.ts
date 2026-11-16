import type { LanguageModel } from "ai";
import { proposeIntake, type IntakeModelResult } from "@/lib/ai/draft";
import { INTAKE_REQUEST_MAX } from "@/lib/ai/prompts/intake";
import type { IntakeExtraction } from "@/lib/ai/schema";
import { CLIENT_FORBIDDEN_MESSAGE, EMPTY_CLIENT_CARD, normalizeEmail, normalizeName, type ClientCardValues } from "@/lib/clients";
import { isStaff } from "@/lib/roles";
import { isPracticeDate } from "@/lib/slots";

// Чернетка картки клієнта з тексту звернення (зріз 4). Модель лише витягує дані; правила, які можна перевірити
// кодом, — тут, на сервері (дата, вік і тип, email, «Missing: …»), а не лише в промпті.

// Тексти «Тоді» з AC вимоги PM #36 — дослівно.
export const DRAFT_READY_MESSAGE = "Draft ready. Check the fields and create the card."; // AC-INTAKE-01, 02
export const DRAFT_REFUSED_MESSAGE =
  "This text can't be used to draft a client card. Paste the client's request or fill in the form manually."; // AC-INTAKE-06, 07
export const ASSISTANT_UNAVAILABLE_MESSAGE = "The assistant is unavailable right now. Fill in the form manually."; // AC-INTAKE-08
export const INTAKE_HINT =
  "Don't paste diagnoses or other health details: name, date of birth, language and contacts are enough.";
export const INTAKE_EMPTY_MESSAGE = "Paste the client's request first.";

// AC-INTAKE-04: «Missing: …» — порожні обов'язкові поля в порядку форми.
export function incompleteMessage(missing: string[]): string {
  return `Draft is incomplete. Missing: ${missing.join(", ")}. Fill them in manually.`;
}

export const ADULT_AGE = 18;

// Повних років на «сьогодні» практики (обидві дати — РРРР-ММ-ДД).
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

// Дата народження: лише справжня дата РРРР-ММ-ДД, не пізніша за сьогодні (AC-INTAKE-05).
export function draftBirthDate(value: string | null, today: string): string {
  if (!value || !isPracticeDate(value)) return "";
  return value > today ? "" : value;
}

export type IntakeDraft = { values: ClientCardValues; missing: string[]; message: string };

type RequiredField = [keyof ClientCardValues, string];
const COMMON_REQUIRED: RequiredField[] = [
  ["full_name", "Name"],
  ["birth_date", "Date of birth"],
  ["session_language", "Session language"],
];
const ADULT_REQUIRED: RequiredField[] = [...COMMON_REQUIRED, ["email", "Email"]];
const CHILD_REQUIRED: RequiredField[] = [
  ...COMMON_REQUIRED,
  ["guardian_name", "Guardian name"],
  ["guardian_email", "Guardian email"],
];

const draftName = (value: string | null) => (value ? (normalizeName(value) ?? "") : "");
const draftEmail = (value: string | null) => (value ? (normalizeEmail(value) ?? "") : "");

// Тип клієнта рахує код: Child, якщо пише опікун або клієнту за датою з тексту менше 18 років (GC-03, GC-05).
function isChildClient(extraction: IntakeExtraction, birthDate: string, today: string): boolean {
  return extraction.writer_is_guardian || (birthDate !== "" && ageOn(birthDate, today) < ADULT_AGE);
}

// Відповідь моделі (status ok / needs_info) → значення форми й повідомлення. Модель не вирішує тип клієнта,
// дату й email — це робить код.
export function buildIntakeDraft(extraction: IntakeExtraction, today: string): IntakeDraft {
  const birthDate = draftBirthDate(extraction.birth_date, today);
  const isChild = isChildClient(extraction, birthDate, today);
  const guardian = isChild && extraction.writer_is_guardian;
  const values: ClientCardValues = {
    ...EMPTY_CLIENT_CARD,
    client_type: isChild ? "child" : "adult",
    full_name: draftName(extraction.client_name),
    birth_date: birthDate,
    session_language: extraction.session_language ?? "",
    // Для дорослого — email клієнта; для дитини — лише email опікуна (GC-05: email клієнта не стає email опікуна).
    email: isChild ? "" : draftEmail(extraction.client_email),
    guardian_name: guardian ? draftName(extraction.guardian_name) : "",
    guardian_email: guardian ? draftEmail(extraction.guardian_email) : "",
  };
  const missing = (isChild ? CHILD_REQUIRED : ADULT_REQUIRED).filter(([field]) => values[field] === "").map(([, label]) => label);
  return { values, missing, message: missing.length ? incompleteMessage(missing) : DRAFT_READY_MESSAGE };
}

export type IntakeState =
  | { status: "idle" }
  | { status: "draft"; values: ClientCardValues; complete: boolean; message: string; request: string; at: number }
  | { status: "refused" | "unavailable" | "invalid" | "forbidden"; message: string; request: string; at: number };

// Модель не відмовила, але не знайшла жодного поля нової картки: це не звернення нового клієнта (AC-INTAKE-06).
// Правило коду, а не лише промпту: інакше порожня «чернетка» замінила б уже введене у формі.
export function hasNoClientData(extraction: IntakeExtraction): boolean {
  return [
    extraction.client_name,
    extraction.birth_date,
    extraction.session_language,
    extraction.client_email,
    extraction.guardian_name,
    extraction.guardian_email,
  ].every((value) => value === null || value.trim() === "");
}

// Результат моделі → стан форми. Відмова й «недоступний» форму картки не змінюють (AC-INTAKE-06, 07, 08).
export function intakeOutcome(
  result: IntakeModelResult,
  today: string,
  request: string,
  at: number,
): Exclude<IntakeState, { status: "idle" }> {
  if (!result.ok) return { status: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE, request, at };
  if (result.extraction.status === "refused" || hasNoClientData(result.extraction)) {
    return { status: "refused", message: DRAFT_REFUSED_MESSAGE, request, at };
  }
  const draft = buildIntakeDraft(result.extraction, today);
  return { status: "draft", values: draft.values, complete: draft.missing.length === 0, message: draft.message, request, at };
}

// Залежності чернетки: модель (фабрика — її будують лише для працівника), денний ліміт і годинник.
export type IntakeDeps = {
  model: () => LanguageModel | null;
  takeQuota: () => Promise<boolean>;
  now?: () => number;
};

// Чернетка для користувача, що вже увійшов (дія requestIntakeDraft перевіряє сесію через getClaims). Роль — ДО
// моделі й ліміту (AC-INTAKE-09); без моделі (немає ключа) чи з вичерпаним денним лімітом — «недоступний»
// (AC-INTAKE-08). Нічого не пише в картки (AC-INTAKE-03): повертає значення у форму. `at` — час ВІДПОВІДІ: форма
// порівнює його з часом дії «Create client», тож чернетка, що прийшла останньою, не губиться.
export async function draftIntakeFor(
  role: string | null,
  rawRequest: string,
  today: string,
  deps: IntakeDeps,
): Promise<Exclude<IntakeState, { status: "idle" }>> {
  const now = deps.now ?? Date.now;
  const request = rawRequest.slice(0, INTAKE_REQUEST_MAX);
  if (!isStaff(role)) return { status: "forbidden", message: CLIENT_FORBIDDEN_MESSAGE, request: "", at: now() };
  if (!request.trim()) return { status: "invalid", message: INTAKE_EMPTY_MESSAGE, request, at: now() };
  const model = deps.model();
  if (!model || !(await deps.takeQuota())) {
    return { status: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE, request, at: now() };
  }
  const result = await proposeIntake(request, model);
  return intakeOutcome(result, today, request, now());
}
