import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOME_STATS_MESSAGES, loadHomeStats } from "@/app/(app)/data";
import { DayChart } from "@/components/schedule-stats";
import { practiceTimeToUtc, type HoldRecord } from "@/lib/slots";
import { bookedPercent, scheduleStats } from "@/lib/stats";

// Статистика головної (DESIGN.md, розділ 6b): вимог PM до неї немає, тож тести без AC ID.
function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

// Сьогодні середа 2026-11-04, 12:30: вікно — 11-04 (ср) … 11-10 (вт).
const NOW = at("2026-11-04", 12, 30);
// Пн–пт 09:00–17:00: вісім слотів на день (останній о 16:00).
const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_hour: 9, end_hour: 17 }));

const hold = (id: string, date: string, hour: number, created: Date, confirmed: Date | null = null): HoldRecord => ({
  id,
  slotStart: at(date, hour),
  createdAt: created,
  confirmedAt: confirmed,
  clientName: "client",
});

const holds = [
  hold("held", "2026-11-05", 10, at("2026-11-04", 9)), // активне до 11-05 09:00
  hold("session", "2026-11-06", 10, at("2026-11-02", 9), at("2026-11-02", 10)),
  hold("expired", "2026-11-09", 10, at("2026-11-02", 10)), // прострочене: слот вільний
  hold("weekend", "2026-11-07", 11, at("2026-11-03", 9), at("2026-11-03", 10)), // сеанс поза доступністю
  hold("started", "2026-11-04", 12, at("2026-11-01", 9), at("2026-11-01", 10)), // уже почався о 12:00
  hold("later", "2026-11-12", 10, at("2026-11-04", 9)), // поза вікном 7 днів
];

const therapist = { id: "t1", name: "Therapist One", availability: weekdays, holds };

describe("scheduleStats", () => {
  // Як на /my-schedule (терапевт): години сеансів поза доступністю теж рахуються.
  const stats = scheduleStats([therapist], NOW, { includeHoldHours: true });

  it("рахує 7 днів від сьогодні, лише слоти, що ще не почалися", () => {
    expect(stats.from).toBe("2026-11-04");
    expect(stats.days.map((day) => day.date)).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
    ]);
    // Сьогодні: 09:00–12:00 минули (зокрема сеанс о 12:00), лишаються 13:00–16:00.
    expect(stats.days[0]).toEqual({ date: "2026-11-04", confirmed: 0, held: 0, free: 4 });
    expect(stats.days[1]).toEqual({ date: "2026-11-05", confirmed: 0, held: 1, free: 7 });
    expect(stats.days[2]).toEqual({ date: "2026-11-06", confirmed: 1, held: 0, free: 7 });
    // Субота: доступності немає, але сеанс рахується.
    expect(stats.days[3]).toEqual({ date: "2026-11-07", confirmed: 1, held: 0, free: 0 });
    expect(stats.days[4]).toEqual({ date: "2026-11-08", confirmed: 0, held: 0, free: 0 });
    // Прострочене утримання слот не займає.
    expect(stats.days[5]).toEqual({ date: "2026-11-09", confirmed: 0, held: 0, free: 8 });
  });

  it("підсумки — сума днів; розбивка за терапевтом", () => {
    expect(stats.totals).toEqual({ confirmed: 2, held: 1, free: 34 });
    expect(stats.therapists).toEqual([{ id: "t1", name: "Therapist One", confirmed: 2, held: 1, free: 34 }]);
  });

  it("як на /slots (адміністратор і планувальник): сеанс поза доступністю не рахується", () => {
    const slotsView = scheduleStats([therapist], NOW, { includeHoldHours: false });
    expect(slotsView.days[3]).toEqual({ date: "2026-11-07", confirmed: 0, held: 0, free: 0 });
    expect(slotsView.totals).toEqual({ confirmed: 1, held: 1, free: 34 });
  });

  it("bookedPercent: частка утриманих і підтверджених; без слотів — null", () => {
    expect(bookedPercent({ confirmed: 1, held: 2, free: 1 })).toBe(75);
    expect(bookedPercent({ confirmed: 0, held: 0, free: 0 })).toBeNull();
  });

  it("bookedPercent: 100% лише без вільних, 0% лише без зайнятих", () => {
    expect(bookedPercent({ confirmed: 199, held: 0, free: 1 })).toBe(99);
    expect(bookedPercent({ confirmed: 1, held: 0, free: 299 })).toBe(1);
    expect(bookedPercent({ confirmed: 2, held: 1, free: 0 })).toBe(100);
    expect(bookedPercent({ confirmed: 0, held: 0, free: 5 })).toBe(0);
  });
});

type Row = Record<string, unknown>;

// Підмінений клієнт Supabase: фіксуємо, які таблиці й межі запитує завантажувач. Що RLS віддає кожній ролі, перевіряють
// тести tests/db на PGlite; тут — що роль обирає джерело даних.
function fakeSupabase(tables: Record<string, Row[]>) {
  const calls: string[] = [];
  const from = (table: string) => {
    calls.push(table);
    let rows = tables[table] ?? [];
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: (a: number, b: number) => (calls.push(`range ${table} ${a}-${b}`), (rows = rows.slice(a, b + 1)), chain),
      gte: (_col: string, value: string) => (calls.push(`gte ${value}`), chain),
      lt: (_col: string, value: string) => (calls.push(`lt ${value}`), chain),
      ilike: (_col: string, value: string) => (calls.push(`ilike ${value}`), chain),
      then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return chain;
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls.push(`rpc ${name} ${args.p_from}..${args.p_to}`);
    return { data: tables[name] ?? [], error: null };
  };
  return { client: { from, rpc } as never, calls };
}

describe("loadHomeStats", () => {
  it("планувальник: уся практика, утримання в межах 7 днів, доступність за email без урахування регістру", async () => {
    const { client, calls } = fakeSupabase({
      profiles: [
        { id: "t1", full_name: "Therapist One", email: "one@example.test" },
        { id: "t2", full_name: null, email: "two@example.test" },
      ],
      therapist_availability: weekdays.map((w) => ({ ...w, therapist_email: "One@Example.test" })),
      holds: [
        {
          id: "h1",
          therapist_id: "t1",
          slot_start: at("2026-11-05", 10).toISOString(),
          created_at: at("2026-11-04", 9).toISOString(),
          confirmed_at: null,
          clients: { full_name: "client" },
        },
      ],
    });
    const { stats } = await loadHomeStats(client, { id: "s1", email: "s@example.test", role: "scheduler" }, NOW);

    expect(calls).toContain(`gte ${at("2026-11-04", 0).toISOString()}`);
    expect(calls).toContain(`lt ${at("2026-11-11", 0).toISOString()}`);
    expect(stats?.therapists).toEqual([
      { id: "t1", name: "Therapist One", confirmed: 0, held: 1, free: 35 },
      { id: "t2", name: "two@example.test", confirmed: 0, held: 0, free: 0 },
    ]);
  });

  it("терапевт: лише власний розклад через my_schedule, без запиту профілів і всіх утримань", async () => {
    const { client, calls } = fakeSupabase({
      therapist_availability: weekdays,
      my_schedule: [
        {
          id: "s1",
          slot_start: at("2026-11-06", 10).toISOString(),
          created_at: at("2026-11-02", 9).toISOString(),
          confirmed_at: at("2026-11-02", 10).toISOString(),
          client_name: "client",
        },
      ],
    });
    const { stats } = await loadHomeStats(client, { id: "t1", email: "t_1@example.test", role: "therapist" }, NOW);

    expect(calls).toEqual([
      "therapist_availability",
      "ilike t\\_1@example.test",
      "rpc my_schedule 2026-11-04..2026-11-11",
    ]);
    expect(stats?.totals).toEqual({ confirmed: 1, held: 0, free: 35 });
  });

  it("читає утримання сторінками: рядок понад 1000 не губиться", async () => {
    const expired = Array.from({ length: 1000 }, (_, i) => ({
      id: `e${String(i).padStart(4, "0")}`,
      therapist_id: "t1",
      slot_start: at("2026-11-09", 10).toISOString(),
      created_at: at("2026-11-01", 9).toISOString(),
      confirmed_at: null,
      clients: { full_name: "client" },
    }));
    const held = {
      ...expired[0],
      id: "h1",
      slot_start: at("2026-11-05", 10).toISOString(),
      created_at: at("2026-11-04", 9).toISOString(),
    };
    const { client, calls } = fakeSupabase({
      profiles: [{ id: "t1", full_name: "Therapist One", email: "one@example.test" }],
      therapist_availability: weekdays.map((w) => ({ ...w, therapist_email: "one@example.test" })),
      holds: [...expired, held],
    });
    const { stats } = await loadHomeStats(client, { id: "s1", email: "s@example.test", role: "admin" }, NOW);

    expect(calls).toEqual(expect.arrayContaining(["range holds 0-999", "range holds 1000-1999"]));
    expect(stats?.totals.held).toBe(1);
  });

  it("терапевт без email: окреме повідомлення без «Try again», без запитів", async () => {
    const { client, calls } = fakeSupabase({});
    const result = await loadHomeStats(client, { id: "t1", email: null, role: "therapist" }, NOW);

    expect(result).toEqual({ stats: null, error: HOME_STATS_MESSAGES.NO_EMAIL });
    expect(result.error).not.toContain("Try again");
    expect(calls).toEqual([]);
  });
});

describe("DayChart", () => {
  const stats = scheduleStats([therapist], NOW, { includeHoldHours: true });
  const html = renderToStaticMarkup(createElement(DayChart, { days: stats.days, today: stats.from }));

  it("стовпець на кожен день: у фокусі, з описом усіх статусів для скрінрідера", () => {
    expect(html.match(/data-testid="chart-day"/g)).toHaveLength(7);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="img"');
    // Той самий опис, що в підказці, разом із часткою зайнятих.
    expect(html).toContain('aria-label="Thursday, 2026-11-05: 0 confirmed, 1 held, 7 free, 13% booked"');
    expect(html).toContain(">Today<");
  });

  it("легенда підписує кожен колір текстом; порожніх сегментів немає", () => {
    for (const label of ["Confirmed", "Held", "Free"]) expect(html).toContain(`</span>${label}</li>`);
    // Неділя: слотів немає — висота 0, без сегментів.
    const sunday = html.split('data-testid="chart-day"')[5];
    expect(sunday).toContain("height:max(0%, 0px)");
    expect(sunday).not.toContain("flex-grow");
  });

  it("малий стовпець не нижчий за свої сегменти й зазори", () => {
    const small = scheduleStats(
      [{ ...therapist, availability: [...weekdays, { weekday: 3, start_hour: 0, end_hour: 24 }] }],
      NOW,
      { includeHoldHours: true },
    );
    // Четвер: 1 Held і 7 Free — два сегменти: 2 × 3px + 2px.
    const thursday = renderToStaticMarkup(createElement(DayChart, { days: small.days, today: small.from })).split(
      'data-testid="chart-day"',
    )[2];
    expect(thursday).toContain(", 8px)");
  });
});
