// Статус перевірки страхування в картці клієнта (openspec/specs/client-insurance/spec.md). Без React і Supabase,
// щоб тестувати unit. Значення — ті самі, що check clients_insurance_status_check у міграції
// 20261107181916_client_insurance_status.sql (вона остаточна); тексти — дослівно з вимоги PM.
import { isStaff } from "./roles";

// Значення бази → текст PM. Порядок — як у вимозі.
export const INSURANCE_STATUSES = {
  not_set: "Not set",
  verified: "Verified",
  not_accepted: "Not accepted",
  private_pay: "Private pay",
} as const;

export type InsuranceStatus = keyof typeof INSURANCE_STATUSES;

// Підпис рядка в картці: разом зі статусом дає «Insurance: <статус>» (AC-INS-01).
export const INSURANCE_LABEL = "Insurance:";

export function isInsuranceStatus(value: unknown): value is InsuranceStatus {
  return typeof value === "string" && Object.hasOwn(INSURANCE_STATUSES, value);
}

// Текст статусу для картки (AC-INS-01). Невідоме значення база не пропустить (check); якщо типи й база колись
// розійдуться, повертаємо null, і сторінка показує помилку завантаження, а не вигаданий «Not set».
export function insuranceStatusText(status: string): string | null {
  return isInsuranceStatus(status) ? INSURANCE_STATUSES[status] : null;
}

// Повний рядок картки «Insurance: <статус>» (AC-INS-01) — його текст бачить користувач і перевіряє e2e;
// null — те саме невідоме значення, що й у insuranceStatusText.
export function insuranceLine(status: string): string | null {
  const text = insuranceStatusText(status);
  return text && `${INSURANCE_LABEL} ${text}`;
}

// Зміна статусу (AC-INS-02…05). «Not set» — лише початковий: позначити можна три інші, повернути «Not set» не можна
// (те саме тримає with check політики clients_update_insurance_staff у 20261112182017_client_insurance_update.sql).
export const SETTABLE_INSURANCE_STATUSES = ["verified", "not_accepted", "private_pay"] as const;
export type SettableInsuranceStatus = (typeof SETTABLE_INSURANCE_STATUSES)[number];

// Ім'я поля форми й дії setInsuranceStatus.
export const INSURANCE_FIELD = "insurance_status";

export const INSURANCE_SAVED_MESSAGE = "Insurance status saved."; // AC-INS-02 (дослівно з вимоги PM)
// Формулювання наші: PM тексту для них не задав (терапевту форму не показуємо — AC-INS-04).
export const INSURANCE_FORBIDDEN_MESSAGE = "Only schedulers and admins can change the insurance status."; // AC-INS-05
export const INSURANCE_CHOOSE_MESSAGE = "Choose a status to save.";
export const INSURANCE_NO_CLIENT_MESSAGE = "This client doesn't exist.";
export const INSURANCE_SAVE_ERROR_MESSAGE = "Could not save the insurance status. Try again later.";

// Значення з форми → статус для запису; усе інше (зокрема «not_set») — null, без звернення до бази.
export function parseInsuranceStatus(value: unknown): SettableInsuranceStatus | null {
  return (SETTABLE_INSURANCE_STATUSES as readonly unknown[]).includes(value) ? (value as SettableInsuranceStatus) : null;
}

// Хто може змінювати статус: лише планувальник і адміністратор (AC-INS-02, 03); терапевт — ні (AC-INS-04, 05).
export function canChangeInsurance(role: string | null | undefined): boolean {
  return isStaff(role);
}
