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

const FALLBACK_MESSAGE = "Could not hold the slot. Try again.";

// Перевірка запиту до виклику бази: роль (AC-HOLD-08), вибраний клієнт, слот ще не почався (AC-HOLD-07).
export function checkHoldRequest(input: {
  isStaff: boolean;
  slotStart: Date | null;
  clientId: string;
  now: Date;
}): HoldErrorCode | null {
  if (!input.isStaff) return "NOT_STAFF";
  if (!input.slotStart || Number.isNaN(input.slotStart.getTime())) return "SLOT_UNKNOWN";
  if (!input.clientId) return "CLIENT_UNKNOWN";
  if (input.slotStart.getTime() <= input.now.getTime()) return "SLOT_STARTED";
  return null;
}

// Код помилки з raise exception у private.hold_slot (message) → текст PM.
export function holdErrorMessage(message: string | undefined): string {
  const code = Object.keys(HOLD_MESSAGES).find((key) => message?.includes(key));
  return code ? HOLD_MESSAGES[code as HoldErrorCode] : FALLBACK_MESSAGE;
}
