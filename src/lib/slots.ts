// Слоти терапевта й утримання (openspec/specs/slot-holds/spec.md).
// Час практики — America/Los_Angeles з точністю до хвилини; утримання триває рівно 1440 хвилин від створення,
// тож статус рахуємо від моменту, а не від годинника (перехід на літній/зимовий час не змінює тривалість).

export const PRACTICE_TIME_ZONE = "America/Los_Angeles";
export const HOLD_MINUTES = 1440;
export const NO_FREE_SLOTS_MESSAGE = "No free slots on this day.";

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function practiceParts(date: Date) {
  const parts = Object.fromEntries(
    wallClock.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

// «2026-11-03 14:30» — формат Assumptions специфікації.
export function formatPracticeTime(date: Date): string {
  const p = practiceParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// Календарний день практики «2026-11-03» для моменту.
export function practiceDate(date: Date): string {
  const p = practiceParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function isPracticeDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Різниця між годинником практики і UTC для моменту, у мілісекундах.
function offsetMs(date: Date): number {
  const p = practiceParts(date);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const minute = Math.floor(date.getTime() / 60_000) * 60_000;
  return asUtc - minute;
}

// Момент, коли в практиці настає `date` о `hour`:00.
export function practiceTimeToUtc(date: string, hour: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour);
  const first = wall - offsetMs(new Date(wall));
  // Другий прохід — якщо між першою оцінкою і цільовим часом змінився зсув (перехід на літній/зимовий час).
  return new Date(wall - offsetMs(new Date(first)));
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ISO-день тижня: 1 = понеділок … 7 = неділя (як therapist_availability.weekday).
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export type HoldStatus = "Held" | "Expired" | "Confirmed";

export type HoldRecord = {
  id: string;
  slotStart: Date;
  createdAt: Date;
  confirmedAt: Date | null;
  clientName: string;
};

export function heldUntil(hold: Pick<HoldRecord, "createdAt">): Date {
  return new Date(hold.createdAt.getTime() + HOLD_MINUTES * 60_000);
}

// AC-HOLD-05: о 14:29 наступного дня — «Held»; AC-HOLD-06: о 14:30 і пізніше — «Expired».
export function holdStatus(hold: Pick<HoldRecord, "createdAt" | "confirmedAt">, now: Date): HoldStatus {
  if (hold.confirmedAt) return "Confirmed";
  return now.getTime() < heldUntil(hold).getTime() ? "Held" : "Expired";
}

export type SlotStatus = "Free" | "Held" | "Confirmed";

export type DaySlot = {
  start: Date;
  time: string; // «10:00»
  status: SlotStatus;
  clientName: string | null;
  heldUntil: Date | null;
  canHold: boolean;
  holdId: string | null; // утримання «Held», яке можна підтвердити (AC-HOLD-12)
};

export type AvailabilityWindow = { start_hour: number; end_hour: number };

// Слоти вибраного дня: години доступності терапевта, кожна — вільна, утримана або підтверджена.
// Прострочене утримання слот не займає (AC-HOLD-06). Утримати можна лише вільний слот, що ще не почався (AC-HOLD-01).
export function buildDaySlots(input: {
  date: string;
  availability: AvailabilityWindow[];
  holds: HoldRecord[];
  now: Date;
}): DaySlot[] {
  const hours = new Set<number>();
  for (const window of input.availability) {
    for (let hour = window.start_hour; hour < window.end_hour; hour++) hours.add(hour);
  }

  return [...hours]
    .sort((a, b) => a - b)
    .map((hour) => {
      const start = practiceTimeToUtc(input.date, hour);
      const active = input.holds
        .filter((hold) => hold.slotStart.getTime() === start.getTime())
        .map((hold) => ({ hold, status: holdStatus(hold, input.now) }))
        .find((entry): entry is { hold: HoldRecord; status: "Held" | "Confirmed" } => entry.status !== "Expired");

      const status: SlotStatus = active ? active.status : "Free";
      return {
        start,
        time: `${String(hour).padStart(2, "0")}:00`,
        status,
        clientName: active ? active.hold.clientName : null,
        heldUntil: active && active.status === "Held" ? heldUntil(active.hold) : null,
        canHold: status === "Free" && start.getTime() > input.now.getTime(),
        holdId: active && active.status === "Held" ? active.hold.id : null,
      };
    });
}

// AC-HOLD-18: повідомлення, коли в дні немає жодного вільного слоту.
export function hasFreeSlots(slots: DaySlot[]): boolean {
  return slots.some((slot) => slot.status === "Free");
}
