import { describe, expect, it } from "vitest";
import { loadMySchedule } from "@/app/my-schedule/data";
import { practiceTimeToUtc } from "@/lib/slots";

function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

type Row = Record<string, unknown>;

// Підмінений клієнт Supabase: фіксує фільтри запитів і повертає лише рядки, що їм відповідають.
// Обмеження: ізоляцію між терапевтами в базі забезпечує RLS holds_select_own_therapist; тут перевіряємо лише,
// що завантажувач сам фільтрує за власним id та email. RLS перевіряє db-check (міграції на одноразовій базі).
function fakeSupabase(tables: { therapist_availability: Row[]; holds: Row[] }) {
  const filters: Record<string, Record<string, unknown>> = {};
  const query = (table: keyof typeof tables) => {
    const f: Record<string, unknown> = {};
    filters[table] = f;
    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => ((f[col] = val), chain),
      ilike: (col: string, val: string) => ((f[col] = val.toLowerCase()), chain),
      gte: () => chain,
      lt: () => chain,
      then: (resolve: (v: unknown) => void) =>
        resolve({
          data: tables[table].filter((row) =>
            Object.entries(f).every(([k, v]) => (typeof row[k] === "string" ? String(row[k]).toLowerCase() : row[k]) === v),
          ),
          error: null,
        }),
    };
    return chain;
  };
  return { client: { from: query } as never, filters };
}

const availability = [
  { therapist_email: "therapist1@example.test", weekday: 2, start_hour: 10, end_hour: 12 },
  { therapist_email: "therapist1@example.test", weekday: 4, start_hour: 10, end_hour: 11 },
  { therapist_email: "therapist2@example.test", weekday: 2, start_hour: 10, end_hour: 12 },
];

describe("slot-holds: розклад терапевта", () => {
  it("AC-HOLD-09: therapist1 бачить своє утримання з client1 і «Held until», а не розклад і утримання therapist2", async () => {
    const holds = [
      {
        id: "h1",
        therapist_id: "t1",
        slot_start: at("2026-11-03", 10).toISOString(),
        created_at: at("2026-11-02", 14, 30).toISOString(),
        confirmed_at: null,
        clients: { full_name: "client1" },
      },
      {
        id: "h2",
        therapist_id: "t2",
        slot_start: at("2026-11-03", 11).toISOString(),
        created_at: at("2026-11-02", 15).toISOString(),
        confirmed_at: null,
        clients: { full_name: "client2" },
      },
    ];
    const { client, filters } = fakeSupabase({ therapist_availability: availability, holds });

    const { days } = await loadMySchedule(client, { id: "t1", email: "therapist1@example.test" }, at("2026-11-02", 16));

    expect(filters.holds).toEqual({ therapist_id: "t1" });
    expect(filters.therapist_availability).toEqual({ therapist_email: "therapist1@example.test" });
    const tuesday = days.find((d) => d.date === "2026-11-03")!;
    expect(tuesday.slots.map((s) => [s.time, s.status, s.clientName])).toEqual([
      ["10:00", "Held", "client1"],
      ["11:00", "Free", null],
    ]);
    expect(tuesday.slots[0].heldUntil).not.toBeNull();
    expect(days.flatMap((d) => d.slots).some((s) => s.clientName === "client2")).toBe(false);
  });

  it("AC-HOLD-21: о 2026-11-03 15:00 прострочене утримання за client1 у розкладі не показано, слот 2026-11-05 10:00 вільний", async () => {
    const holds = [
      {
        id: "h-expired",
        therapist_id: "t1",
        slot_start: at("2026-11-05", 10).toISOString(),
        created_at: at("2026-11-02", 14, 30).toISOString(),
        confirmed_at: null,
        clients: { full_name: "client1" },
      },
    ];
    const { client } = fakeSupabase({ therapist_availability: availability, holds });

    const { days } = await loadMySchedule(client, { id: "t1", email: "therapist1@example.test" }, at("2026-11-03", 15));

    const thursday = days.find((d) => d.date === "2026-11-05")!;
    expect(thursday.slots).toHaveLength(1);
    expect(thursday.slots[0].status).toBe("Free");
    expect(thursday.slots[0].clientName).toBeNull();
  });
});
