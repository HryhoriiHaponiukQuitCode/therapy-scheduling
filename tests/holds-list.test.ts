import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_HORIZON_DAYS,
  buildDaySlots,
  hasFreeSlots,
  holdsList,
  NO_FREE_SLOTS_MESSAGE,
  practiceTimeToUtc,
  type HoldListRecord,
} from "@/lib/slots";
import { loadHolds } from "@/app/(app)/holds/data";

// Список утримань /holds (holdsList) і статус «Past» (buildDaySlots) з фіксованим now — дані з «Дано» AC PM.

function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

function hold(
  id: string,
  client: string,
  therapist: string,
  slot: Date,
  created: Date,
  confirmed: Date | null = null,
): HoldListRecord {
  return {
    id,
    slotStart: slot,
    createdAt: created,
    confirmedAt: confirmed,
    clientName: client,
    clientId: client,
    therapistId: therapist,
    therapistName: therapist,
  };
}

const view = (holds: HoldListRecord[], now: Date) => holdsList(holds, now).map((h) => [h.clientName, h.status]);

// Утримання client1 на 2026-11-05 10:00, створене 2026-11-02 14:30 — «Expired» з 2026-11-03 14:30.
const expiredClient1 = hold("h1", "client1", "therapist1", at("2026-11-05", 10), at("2026-11-02", 14, 30));

describe("список утримань", () => {
  it("AC-HOLD-28: 2026-11-05 о 09:59 прострочене утримання client1 видно зі статусом «Expired»", () => {
    expect(view([expiredClient1], at("2026-11-05", 9, 59))).toEqual([["client1", "Expired"]]);
  });

  it("AC-HOLD-29: з 10:00 2026-11-05 і пізніше це утримання не показано", () => {
    expect(view([expiredClient1], at("2026-11-05", 10))).toEqual([]);
    expect(view([expiredClient1], at("2026-11-05", 10, 30))).toEqual([]);
  });

  it("AC-HOLD-38: лише «Held» і «Expired» за часом слоту — client2, потім client1; без client3 і client4", () => {
    const holds = [
      expiredClient1,
      hold("h2", "client2", "therapist2", at("2026-11-04", 11), at("2026-11-03", 14)),
      hold("s3", "client3", "therapist1", at("2026-11-04", 12), at("2026-11-02", 10), at("2026-11-02", 11)),
      hold("s4", "client4", "therapist1", at("2026-11-02", 10), at("2026-10-30", 10), at("2026-10-30", 11)),
    ];
    expect(view(holds, at("2026-11-03", 15))).toEqual([
      ["client2", "Held"],
      ["client1", "Expired"],
    ]);
  });

  it("AC-HOLD-42: «Held» client2 на 2026-11-03 10:00 видно о 09:59, а з 10:00 — ні", () => {
    const held = hold("h2", "client2", "therapist1", at("2026-11-03", 10), at("2026-11-02", 14, 30));
    expect(view([held], at("2026-11-03", 9, 59))).toEqual([["client2", "Held"]]);
    expect(view([held], at("2026-11-03", 10))).toEqual([]);
  });

  it("AC-HOLD-43: слот утримано за client2 — видно і «Held» client2, і «Expired» client1 до початку слоту", () => {
    const holds = [expiredClient1, hold("h2", "client2", "therapist1", at("2026-11-05", 10), at("2026-11-03", 14, 45))];
    expect(view(holds, at("2026-11-03", 15))).toEqual([
      ["client2", "Held"],
      ["client1", "Expired"],
    ]);
    expect(view(holds, at("2026-11-05", 10))).toEqual([]);
  });

  it("AC-HOLD-37: повторне утримання того самого слоту за client1 приховує його прострочене утримання", () => {
    const again = hold("h3", "client1", "therapist1", at("2026-11-05", 10), at("2026-11-03", 15));
    const [item] = holdsList([expiredClient1, again], at("2026-11-03", 15));
    expect(holdsList([expiredClient1, again], at("2026-11-03", 15))).toHaveLength(1);
    expect(item).toMatchObject({ id: "h3", status: "Held", heldUntil: at("2026-11-04", 15) });
  });
});

describe("статус «Past»", () => {
  const window = [{ start_hour: 10, end_hour: 15 }];

  it("AC-HOLD-32: о 12:30 вільний слот 10:00 і слот 11:00 з простроченим утриманням — «Past», утримати не можна", () => {
    const slots = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 12 }],
      holds: [hold("h1", "client1", "therapist1", at("2026-11-03", 11), at("2026-11-02", 9))],
      now: at("2026-11-03", 12, 30),
    });
    expect(slots.map((s) => [s.time, s.status, s.canHold])).toEqual([
      ["10:00", "Past", false],
      ["11:00", "Past", false],
    ]);
  });

  it("AC-HOLD-33: «Past», «Held» і «Confirmed» без вільних — «No free slots on this day.» і всі чотири слоти", () => {
    const slots = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 12 }, { start_hour: 13, end_hour: 15 }],
      holds: [
        hold("h1", "client1", "therapist1", at("2026-11-03", 13), at("2026-11-03", 9)),
        hold("s1", "client2", "therapist1", at("2026-11-03", 14), at("2026-11-02", 9), at("2026-11-02", 10)),
      ],
      now: at("2026-11-03", 12, 30),
    });
    expect(slots.map((s) => [s.time, s.status])).toEqual([
      ["10:00", "Past"],
      ["11:00", "Past"],
      ["13:00", "Held"],
      ["14:00", "Confirmed"],
    ]);
    expect(hasFreeSlots(slots)).toBe(false);
    expect(NO_FREE_SLOTS_MESSAGE).toBe("No free slots on this day.");
  });

  it("слоти доступності — лише на 8 тижнів уперед від сьогодні", () => {
    const now = at("2026-11-03", 12);
    const last = buildDaySlots({ date: "2026-12-29", availability: window, holds: [], now });
    const beyond = buildDaySlots({ date: "2026-12-30", availability: window, holds: [], now });
    expect(AVAILABILITY_HORIZON_DAYS).toBe(56);
    expect(last).toHaveLength(5);
    expect(beyond).toEqual([]);
  });

  it("за 8 тижнями лишаються години активних утримань і сеансів — без вільних", () => {
    const now = at("2026-11-03", 12);
    const session = hold("s1", "client1", "therapist1", at("2026-12-30", 11), at("2026-10-20", 9), at("2026-10-20", 10));
    const slots = buildDaySlots({ date: "2026-12-30", availability: window, holds: [session], now });
    const schedule = buildDaySlots({
      date: "2026-12-30",
      availability: [],
      holds: [session],
      now,
      includeHoldHours: true,
    });
    expect(slots.map((s) => [s.time, s.status, s.clientName])).toEqual([["11:00", "Confirmed", "client1"]]);
    expect(schedule.map((s) => [s.time, s.status])).toEqual([["11:00", "Confirmed"]]);
  });
});

describe("loadHolds", () => {
  // Підмінений клієнт: is(колонка, значення) фільтрує рядки, як база; решта фільтрів — без змін.
  function fakeSupabase(rows: Record<string, unknown>[]) {
    const filters: [string, unknown][] = [];
    const query = {
      select: () => query,
      is: (column: string, value: unknown) => (filters.push([column, value]), query),
      gt: () => query,
      order: () => query,
      limit: async () => ({ data: rows.filter((row) => filters.every(([c, v]) => row[c] === v)), error: null }),
    };
    return { from: () => query } as never;
  }

  const row = (id: string, created: Date, confirmed: Date | null) => ({
    id,
    therapist_id: "t1",
    client_id: "c1",
    slot_start: at("2026-11-05", 10).toISOString(),
    created_at: created.toISOString(),
    confirmed_at: confirmed?.toISOString() ?? null,
    clients: { full_name: "client1" },
    therapist: { full_name: "therapist1", email: "therapist1@example.test" },
  });

  it("AC-HOLD-37: прострочене утримання client1 сховано, коли його повторне утримання вже підтверджено", async () => {
    const supabase = fakeSupabase([
      row("h1", at("2026-11-02", 14, 30), null),
      row("h3", at("2026-11-03", 15), at("2026-11-03", 15, 10)),
    ]);
    const { holds, error } = await loadHolds(supabase, at("2026-11-03", 16));
    expect(error).toBe(false);
    expect(holds).toEqual([]);
  });

  it("ім'я терапевта — з профілю, вкладеного в утримання", async () => {
    const { holds } = await loadHolds(fakeSupabase([row("h1", at("2026-11-03", 15), null)]), at("2026-11-03", 16));
    expect(holds.map((h) => [h.clientName, h.therapistName, h.status])).toEqual([["client1", "therapist1", "Held"]]);
  });
});
