// Утримання слоту: перевірки до запиту в базу й тексти повідомлень PM (openspec/specs/slot-holds/spec.md).
// Ті самі правила повторює функція private.hold_slot (міграція 20261019111956_hold_slot.sql) — вона остаточна.

export const HOLD_MESSAGES = {
  SLOT_UNAVAILABLE: "This slot is no longer available.", // AC-HOLD-03, AC-HOLD-04, AC-HOLD-17
  SLOT_STARTED: "This slot has already started and cannot be held.", // AC-HOLD-07
  NOT_STAFF: "Only schedulers and admins can hold slots.", // AC-HOLD-08
  SLOT_UNKNOWN: "This slot is not in the therapist's availability.",
  CLIENT_UNKNOWN: "Choose a client.",
} as const;

export type HoldErrorCode = keyof typeof HOLD_MESSAGES;

// id форми утримання на /slots: кнопки Hold у рядках слотів надсилають її через атрибут form.
export const HOLD_FORM_ID = "hold-slot-form";

const FALLBACK_MESSAGE = "Could not hold the slot. Try again.";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Перевірка запиту до виклику бази: роль (AC-HOLD-08), слот, початок слоту (AC-HOLD-07), вибраний клієнт.
// Слот, що вже почався, перевіряємо раніше за клієнта: вибір клієнта його вже не врятує.
export function checkHoldRequest(input: {
  isStaff: boolean;
  therapistId: string;
  slotStart: Date | null;
  clientId: string;
  now: Date;
}): HoldErrorCode | null {
  if (!input.isStaff) return "NOT_STAFF";
  if (
    !UUID_PATTERN.test(input.therapistId) ||
    !input.slotStart ||
    Number.isNaN(input.slotStart.getTime())
  ) {
    return "SLOT_UNKNOWN";
  }
  if (input.slotStart.getTime() <= input.now.getTime()) return "SLOT_STARTED";
  if (!UUID_PATTERN.test(input.clientId)) return "CLIENT_UNKNOWN";
  return null;
}

// Код помилки з raise exception у private.hold_slot (message) → текст PM.
export function holdErrorMessage(message: string | undefined): string {
  const code = Object.keys(HOLD_MESSAGES).find((key) => message?.includes(key));
  return code ? HOLD_MESSAGES[code as HoldErrorCode] : FALLBACK_MESSAGE;
}
