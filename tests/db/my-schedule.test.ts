// Розклад терапевта й доступність у базі (impl-client-cards, задача 5): public.my_schedule
// (міграція 20261027201500_my_schedule.sql) і сид доступності з 20261027201459_weekday_availability.sql на PGlite.
// Утримання створюємо через asService відносно now() бази; день — завтрашній за часом практики.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
const id: Record<string, string> = {};
const user = (email: string) => t.users[`${email}@example.test`];

type ScheduleRow = Record<string, unknown> & { id: string; client_name: string; confirmed_at: string | null };

// Тиждень довкола now(): від учора до +7 днів за часом практики.
const schedule = (email: string) =>
  t.asUser<ScheduleRow>(
    user(email),
    `select * from public.my_schedule(
       ((now() at time zone 'America/Los_Angeles')::date - 1),
       ((now() at time zone 'America/Los_Angeles')::date + 7))`,
  );

async function card(name: string) {
  const [{ id: clientId }] = await t.asService<{ id: string }>(
    `insert into public.clients (full_name, email, birth_date, session_language)
     values ($1, lower(replace($1, ' ', '')) || '@example.test', '1990-05-14', 'English') returning id`,
    [name],
  );
  return clientId;
}

async function hold(therapist: string, clientId: string, slot: string, created: string, confirmed = false) {
  const [{ id: holdId }] = await t.asService<{ id: string }>(
    `insert into public.holds (therapist_id, client_id, slot_start, created_at, confirmed_at)
     values ($1, $2, ${slot}, ${created}, ${confirmed ? "now() - interval '1 hour'" : "null"}) returning id`,
    [therapist, clientId],
  );
  return holdId;
}

const HOUR = "date_trunc('hour', now())";

beforeAll(async () => {
  t = await createTestDb();
  id.client1 = await card("Client One");
  id.client2 = await card("Client Two");
  id.client3 = await card("Client Three");
  const therapist1 = user("therapist1");
  // «Held» client1 у therapist1 через 2 дні.
  id.held = await hold(therapist1, id.client1, `${HOUR} + interval '2 days'`, "now() - interval '1 hour'");
  // «Held» client3 у therapist1, слот уже почався (поточна година), утримання ще не прострочене.
  id.started = await hold(therapist1, id.client3, HOUR, "now() - interval '2 hours'");
  // Прострочене утримання client1 у therapist1 — у розкладі його немає.
  id.expired = await hold(therapist1, id.client1, `${HOUR} + interval '3 days'`, "now() - interval '25 hours'");
  // «Held» client2 у therapist2.
  id.other = await hold(user("therapist2"), id.client2, `${HOUR} + interval '2 days'`, "now() - interval '1 hour'");
}, 60_000);

describe("розклад терапевта (my_schedule)", () => {
  it("AC-HOLD-40: у розкладі therapist1 — ім'я client1, але не його email", async () => {
    const rows = await schedule("therapist1");
    const held = rows.find((row) => row.id === id.held)!;

    expect(held.client_name).toBe("Client One");
    expect(Object.keys(held).sort()).toEqual(["client_name", "confirmed_at", "created_at", "id", "slot_start"]);
    expect(JSON.stringify(rows)).not.toContain("@example.test");
  });

  it("AC-HOLD-09: therapist1 бачить лише власні утримання, без прострочених і без утримань therapist2", async () => {
    const ids = (await schedule("therapist1")).map((row) => row.id).sort();
    expect(ids).toEqual([id.held, id.started].sort());
    expect((await schedule("therapist2")).map((row) => row.id)).toEqual([id.other]);
  });

  it("AC-HOLD-42: утримання «Held», чий слот уже почався, лишається в розкладі з іменем клієнта до прострочення", async () => {
    const started = (await schedule("therapist1")).find((row) => row.id === id.started);
    expect(started).toMatchObject({ client_name: "Client Three", confirmed_at: null });
    // Картку client3 RLS терапевту вже не показує (AC-CARD-14) — ім'я дає лише my_schedule.
    expect(
      await t.asUser(user("therapist1"), "select id from public.clients where id = $1", [id.client3]),
    ).toHaveLength(0);
  });

  it("AC-HOLD-44: планувальник, адміністратор і користувач без ролі не читають розклад терапевта", async () => {
    for (const email of ["scheduler1", "admin1", "newuser1"]) {
      await expect(schedule(email)).rejects.toThrow(/NOT_THERAPIST/);
    }
  });
});

describe("доступність терапевтів (сид)", () => {
  it("AC-HOLD-24: у therapist1 і therapist2 слоти пн–пт 09:00–16:00, у суботу й неділю — жодного", async () => {
    const rows = await t.asService<{ therapist_email: string; weekday: number; start_hour: number; end_hour: number }>(
      `select therapist_email, weekday, start_hour, end_hour from public.therapist_availability
       where therapist_email in ('therapist1@example.test', 'therapist2@example.test')
       order by therapist_email, weekday`,
    );
    const expected = (email: string) =>
      [1, 2, 3, 4, 5].map((weekday) => ({ therapist_email: email, weekday, start_hour: 9, end_hour: 17 }));
    expect(rows).toEqual([...expected("therapist1@example.test"), ...expected("therapist2@example.test")]);
  });

  it("слот далі за 8 тижнів від сьогодні не утримується — SLOT_UNKNOWN", async () => {
    // Понеділок через 9 тижнів о 10:00 за часом практики.
    await expect(
      t.asUser(
        user("scheduler1"),
        `select public.hold_slot($1,
           ((date_trunc('week', now() at time zone 'America/Los_Angeles') + interval '63 days 10 hours')
             at time zone 'America/Los_Angeles'), $2)`,
        [user("therapist1"), id.client2],
      ),
    ).rejects.toThrow(/SLOT_UNKNOWN/);
  });
});
