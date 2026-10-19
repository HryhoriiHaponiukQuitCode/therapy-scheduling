import { describe, expect, it } from "vitest";
import {
  buildDaySlots,
  formatPracticeTime,
  hasFreeSlots,
  holdStatus,
  NO_FREE_SLOTS_MESSAGE,
  practiceTimeToUtc,
  type HoldRecord,
} from "@/lib/slots";

// Момент за годинником практики (America/Los_Angeles): at("2026-11-02", 14, 30) — 2026-11-02 14:30.
function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

function hold(partial: Partial<HoldRecord> & Pick<HoldRecord, "slotStart" | "createdAt">): HoldRecord {
  return { id: "hold", confirmedAt: null, clientName: "client1", ...partial };
}

describe("slot-holds: слоти дня й прострочення", () => {
  it("AC-HOLD-01: 10:00 вільний, 11:00 «Held», 12:00 «Confirmed», утримати можна лише 10:00", () => {
    const now = at("2026-11-02", 16);
    const slots = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 13 }],
      holds: [
        hold({ id: "h11", slotStart: at("2026-11-03", 11), createdAt: at("2026-11-02", 15) }),
        hold({
          id: "h12",
          slotStart: at("2026-11-03", 12),
          createdAt: at("2026-11-02", 9),
          confirmedAt: at("2026-11-02", 10),
          clientName: "client2",
        }),
      ],
      now,
    });

    expect(slots.map((s) => [s.time, s.status])).toEqual([
      ["10:00", "Free"],
      ["11:00", "Held"],
      ["12:00", "Confirmed"],
    ]);
    expect(slots.filter((s) => s.canHold).map((s) => s.time)).toEqual(["10:00"]);
  });

  it("AC-HOLD-05: утримання від 2026-11-02 14:30 о 2026-11-03 14:29 досі «Held»", () => {
    const h = hold({ slotStart: at("2026-11-03", 18), createdAt: at("2026-11-02", 14, 30) });
    const now = at("2026-11-03", 14, 29);

    expect(holdStatus(h, now)).toBe("Held");
    const [slot] = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 18, end_hour: 19 }],
      holds: [h],
      now,
    });
    expect(slot.status).toBe("Held");
    expect(formatPracticeTime(slot.heldUntil!)).toBe("2026-11-03 14:30");
    expect(slot.canHold).toBe(false);
  });

  it("AC-HOLD-06: о 2026-11-03 14:30 і пізніше — «Expired», слот вільний і його можна утримати", () => {
    const h = hold({ slotStart: at("2026-11-03", 18), createdAt: at("2026-11-02", 14, 30) });

    for (const now of [at("2026-11-03", 14, 30), at("2026-11-03", 17, 0)]) {
      expect(holdStatus(h, now)).toBe("Expired");
      const [slot] = buildDaySlots({
        date: "2026-11-03",
        availability: [{ start_hour: 18, end_hour: 19 }],
        holds: [h],
        now,
      });
      expect(slot.status).toBe("Free");
      expect(slot.clientName).toBeNull();
      expect(slot.canHold).toBe(true);
    }
  });

  it("AC-HOLD-18: у therapist1 2026-11-04 немає вільних слотів — «No free slots on this day.»", () => {
    const now = at("2026-11-03", 12);
    const allTaken = buildDaySlots({
      date: "2026-11-04",
      availability: [{ start_hour: 10, end_hour: 12 }],
      holds: [
        hold({ id: "a", slotStart: at("2026-11-04", 10), createdAt: at("2026-11-03", 11) }),
        hold({
          id: "b",
          slotStart: at("2026-11-04", 11),
          createdAt: at("2026-11-03", 9),
          confirmedAt: at("2026-11-03", 9, 30),
        }),
      ],
      now,
    });

    expect(hasFreeSlots(allTaken)).toBe(false);
    // Під повідомленням — обидва слоти з їхніми статусами (змінений AC-HOLD-18, відповідь PM на Q2).
    expect(allTaken.map((s) => [s.time, s.status])).toEqual([
      ["10:00", "Held"],
      ["11:00", "Confirmed"],
    ]);
    expect(NO_FREE_SLOTS_MESSAGE).toBe("No free slots on this day.");
  });

  it("час практики: 2026-11-03 10:00 у America/Los_Angeles — 18:00 UTC (PST)", () => {
    expect(practiceTimeToUtc("2026-11-03", 10).toISOString()).toBe("2026-11-03T18:00:00.000Z");
    expect(formatPracticeTime(new Date("2026-11-03T18:00:00Z"))).toBe("2026-11-03 10:00");
    // До переходу на зимовий час (2026-11-01) — PDT, −7 год.
    expect(practiceTimeToUtc("2026-10-30", 10).toISOString()).toBe("2026-10-30T17:00:00.000Z");
  });
});
