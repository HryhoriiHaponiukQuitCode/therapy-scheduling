import { describe, expect, it } from "vitest";
import { loadMySchedule, weekStartOf } from "@/app/(app)/my-schedule/data";
import { practiceTimeToUtc } from "@/lib/slots";

function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

type Row = Record<string, unknown>;

// Підмінений клієнт Supabase: доступність — запит до therapist_availability (фіксуємо фільтр email), утримання —
// rpc my_schedule (фіксуємо межі тижня). Обмеження: що my_schedule повертає лише власні утримання з іменем без email,
// перевіряє tests/db/my-schedule.test.ts на PGlite; тут — що завантажувач будує тиждень і статуси.
function fakeSupabase(tables: { therapist_availability: Row[]; my_schedule: Row[] }) {
  const calls: { email?: string; rpc?: Record<string, unknown> } = {};
  const from = () => {
    const chain = {
      select: () => chain,
      ilike: (_col: string, value: string) => ((calls.email = value), chain),
      then: (resolve: (v: unknown) => void) => resolve({ data: tables.therapist_availability, error: null }),
    };
    return chain;
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls.rpc = { name, ...args };
    // Як і функція в базі: лише утримання в межах [p_from, p_to) за часом практики.
    const fromTs = practiceTimeToUtc(String(args.p_from), 0).getTime();
    const toTs = practiceTimeToUtc(String(args.p_to), 0).getTime();
    return {
      data: tables.my_schedule.filter((row) => {
        const t = new Date(String(row.slot_start)).getTime();
        return t >= fromTs && t < toTs;
      }),
      error: null,
    };
  };
  return { client: { from, rpc } as never, calls };
}

// Доступність сиду: пн–пт 09:00–16:00 (останній слот о 16:00).
const availability = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_hour: 9, end_hour: 17 }));

const row = (id: string, date: string, hour: number, client: string, created: Date, confirmed: Date | null = null) => ({
  id,
  slot_start: at(date, hour).toISOString(),
  created_at: created.toISOString(),
  confirmed_at: confirmed ? confirmed.toISOString() : null,
  client_name: client,
});

// Дані AC-HOLD-30/31: сьогодні середа 2026-11-04.
const NOW = at("2026-11-04", 12);
const schedule = [
  row("s1", "2026-11-02", 10, "client1", at("2026-10-30", 10), at("2026-10-30", 11)),
  row("h1", "2026-11-06", 10, "client2", at("2026-11-04", 9)),
  row("s2", "2026-11-12", 10, "client3", at("2026-11-03", 10), at("2026-11-03", 11)),
];

const slotsOf = (days: Awaited<ReturnType<typeof loadMySchedule>>["days"], date: string) =>
  days.find((d) => d.date === date)!.slots.map((s) => [s.time, s.status, s.clientName]);

describe("slot-holds: розклад терапевта", () => {
  it("AC-HOLD-09: therapist1 бачить своє утримання з client1 і «Held until»; дані — лише за власним email і my_schedule", async () => {
    const { client, calls } = fakeSupabase({
      therapist_availability: availability,
      my_schedule: [row("h1", "2026-11-03", 10, "client1", at("2026-11-02", 14, 30))],
    });

    const { days } = await loadMySchedule(client, { email: "therapist1@example.test" }, at("2026-11-02", 16));

    expect(calls.email).toBe("therapist1@example.test");
    expect(calls.rpc).toEqual({ name: "my_schedule", p_from: "2026-11-02", p_to: "2026-11-09" });
    const tuesday = days.find((d) => d.date === "2026-11-03")!;
    expect(tuesday.slots[1]).toMatchObject({ time: "10:00", status: "Held", clientName: "client1" });
    expect(tuesday.slots[1].heldUntil).toEqual(at("2026-11-03", 14, 30));
  });

  it("AC-HOLD-21: о 2026-11-03 15:00 прострочене утримання за client1 у розкладі не показано, слот 2026-11-05 10:00 вільний", async () => {
    // my_schedule прострочених не повертає; і навіть якщо рядок є, buildDaySlots вважає слот вільним.
    const { client } = fakeSupabase({
      therapist_availability: availability,
      my_schedule: [row("h-expired", "2026-11-05", 10, "client1", at("2026-11-02", 14, 30))],
    });

    const { days } = await loadMySchedule(client, { email: "therapist1@example.test" }, at("2026-11-03", 15));

    const thursday = days.find((d) => d.date === "2026-11-05")!;
    expect(thursday.slots.find((s) => s.time === "10:00")).toMatchObject({ status: "Free", clientName: null });
  });

  it("AC-HOLD-30: у середу 2026-11-04 therapist1 бачить тиждень 2026-11-02 – 2026-11-08 і не бачить сеансу 2026-11-12", async () => {
    const { client } = fakeSupabase({ therapist_availability: availability, my_schedule: schedule });

    const { weekStart, days } = await loadMySchedule(client, { email: "therapist1@example.test" }, NOW);

    expect(weekStart).toBe("2026-11-02");
    expect(days.map((d) => d.date)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(slotsOf(days, "2026-11-02")).toContainEqual(["10:00", "Confirmed", "client1"]);
    expect(slotsOf(days, "2026-11-06").slice(1, 4)).toEqual([
      ["10:00", "Held", "client2"],
      ["11:00", "Free", null],
      ["12:00", "Free", null],
    ]);
    expect(days.flatMap((d) => d.slots).some((s) => s.clientName === "client3")).toBe(false);
  });

  it("AC-HOLD-31: наступний тиждень — 2026-11-09 – 2026-11-15 і сеанс 2026-11-12 о 10:00 «Confirmed»", async () => {
    const { client, calls } = fakeSupabase({ therapist_availability: availability, my_schedule: schedule });

    const next = await loadMySchedule(client, { email: "therapist1@example.test" }, NOW, "2026-11-09");

    expect(next.weekStart).toBe("2026-11-09");
    expect(next.days.at(-1)!.date).toBe("2026-11-15");
    expect(calls.rpc).toEqual({ name: "my_schedule", p_from: "2026-11-09", p_to: "2026-11-16" });
    expect(slotsOf(next.days, "2026-11-12")).toContainEqual(["10:00", "Confirmed", "client3"]);
    // Будь-який день тижня веде на його понеділок; некоректне значення — на поточний тиждень.
    expect(weekStartOf("2026-11-15")).toBe("2026-11-09");
    expect((await loadMySchedule(client, { email: "therapist1@example.test" }, NOW, "2026-13-40")).weekStart).toBe(
      "2026-11-02",
    );
  });
});
