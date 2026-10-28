import {
  addDays,
  buildDaySlots,
  isoWeekday,
  practiceDate,
  type AvailabilityWindow,
  type DaySlot,
  type HoldRecord,
} from "./slots";

// Статистика головної: слоти найближчих STATS_DAYS днів (від сьогодні за часом практики) за статусами.
// Рахуємо лише слоти, що ще не почалися: минулі («Past») і вже початі сеанси чи утримання — не запас і не
// навантаження наперед. Ті самі правила статусів, що на /slots і /my-schedule (buildDaySlots): прострочене утримання
// слот не займає, години утримань і сеансів поза поточною доступністю теж рахуються.
export const STATS_DAYS = 7;

export type StatusCounts = { confirmed: number; held: number; free: number };
export type DayStats = StatusCounts & { date: string };
export type TherapistStats = StatusCounts & { id: string; name: string };
export type ScheduleStats = { from: string; days: DayStats[]; therapists: TherapistStats[]; totals: StatusCounts };

export type TherapistSchedule = {
  id: string;
  name: string;
  availability: (AvailabilityWindow & { weekday: number })[];
  holds: HoldRecord[];
};

const ZERO: StatusCounts = { confirmed: 0, held: 0, free: 0 };

function add(a: StatusCounts, b: StatusCounts): StatusCounts {
  return { confirmed: a.confirmed + b.confirmed, held: a.held + b.held, free: a.free + b.free };
}

export function countSlots(slots: DaySlot[], now: Date): StatusCounts {
  const upcoming = slots.filter((slot) => slot.start.getTime() > now.getTime());
  return {
    confirmed: upcoming.filter((slot) => slot.status === "Confirmed").length,
    held: upcoming.filter((slot) => slot.status === "Held").length,
    free: upcoming.filter((slot) => slot.status === "Free").length,
  };
}

export function totalSlots(counts: StatusCounts): number {
  return counts.confirmed + counts.held + counts.free;
}

// Частка зайнятих (утриманих і підтверджених) слотів, %; null — слотів немає.
export function bookedPercent(counts: StatusCounts): number | null {
  const total = totalSlots(counts);
  return total === 0 ? null : Math.round(((counts.held + counts.confirmed) / total) * 100);
}

export function scheduleStats(therapists: TherapistSchedule[], now: Date): ScheduleStats {
  const from = practiceDate(now);
  const dates = Array.from({ length: STATS_DAYS }, (_, i) => addDays(from, i));
  const perTherapist = therapists.map((therapist) => ({
    therapist,
    days: dates.map((date) =>
      countSlots(
        buildDaySlots({
          date,
          availability: therapist.availability.filter((window) => window.weekday === isoWeekday(date)),
          holds: therapist.holds,
          now,
          includeHoldHours: true,
        }),
        now,
      ),
    ),
  }));

  const days = dates.map((date, i) => ({ date, ...perTherapist.reduce((sum, p) => add(sum, p.days[i]), ZERO) }));
  return {
    from,
    days,
    therapists: perTherapist.map(({ therapist, days: counts }) => ({
      id: therapist.id,
      name: therapist.name,
      ...counts.reduce(add, ZERO),
    })),
    totals: days.reduce<StatusCounts>(add, ZERO),
  };
}
