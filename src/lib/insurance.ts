// Статус перевірки страхування в картці клієнта (openspec/specs/client-insurance/spec.md). Без React і Supabase,
// щоб тестувати unit. Значення — ті самі, що check clients_insurance_status_check у міграції
// 20261107181916_client_insurance_status.sql (вона остаточна); тексти — дослівно з вимоги PM.

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
