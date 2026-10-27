// Правила утримання й підтвердження в базі (impl-client-cards, задача 4): private.hold_slot з перевіркою CLIENT_BUSY
// (міграція 20261027195559_hold_slot_client_busy.sql) і private.confirm_hold на PGlite з усіма міграціями.
// Слоти — понеділок і вівторок наступного тижня за часом практики, 10:00–14:00: їх мають обидва терапевти (сид
// доступності), і вони завжди в майбутньому. Відмови перевіряють і незмінні дані (asService).
import { beforeAll, describe, expect, it } from "vitest";
import { holdsList, toHoldRecord, type HoldRow } from "@/lib/slots";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
const id: Record<string, string> = {};
const user = (email: string) => t.users[`${email}@example.test`];

// Початок слоту: день тижня (0 — понеділок) і година наступного тижня в America/Los_Angeles.
async function slot(weekday: number, hour: number) {
  const [{ s }] = await t.asService<{ s: string }>(
    `select ((date_trunc('week', now() at time zone 'America/Los_Angeles') + interval '7 days'
              + make_interval(days => $1, hours => $2)) at time zone 'America/Los_Angeles')::text as s`,
    [weekday, hour],
  );
  return s;
}

async function card(name: string) {
  const [{ id: clientId }] = await t.asService<{ id: string }>(
    `insert into public.clients (full_name, email, birth_date, session_language)
     values ($1, lower(replace($1, ' ', '')) || '@example.test', '1990-05-14', 'English') returning id`,
    [name],
  );
  return clientId;
}

const holdSlot = (scheduler: string, therapist: string, slotStart: string, clientId: string) =>
  t.asUser<{ id: string; created_at: string; confirmed_at: string | null }>(
    user(scheduler),
    "select id, created_at::text, confirmed_at from public.hold_slot($1, $2::timestamptz, $3)",
    [user(therapist), slotStart, clientId],
  );

// Утримання клієнта на цей час (усі статуси) — для перевірки, що відмова нічого не додала.
const holdsOf = (clientId: string, slotStart: string) =>
  t.asService<{ therapist_id: string }>(
    "select therapist_id from public.holds where client_id = $1 and slot_start = $2::timestamptz",
    [clientId, slotStart],
  );

beforeAll(async () => {
  t = await createTestDb();
  for (const n of [1, 2, 3, 4, 5]) id[`client${n}`] = await card(`Client ${n}`);
}, 60_000);

describe("утримання: один клієнт — одне утримання на час", () => {
  it("AC-HOLD-25: client1 має «Held» у therapist1 о 10:00 — утримання в therapist2 на той самий час не створюється", async () => {
    const at10 = await slot(0, 10);
    await holdSlot("scheduler1", "therapist1", at10, id.client1);

    await expect(holdSlot("scheduler2", "therapist2", at10, id.client1)).rejects.toThrow(/CLIENT_BUSY/);
    expect(await holdsOf(id.client1, at10)).toEqual([{ therapist_id: user("therapist1") }]);

    // «Confirmed» теж займає клієнта, навіть коли від утримання минуло понад 24 години; інший клієнт на той
    // самий час — не заважає.
    const at11 = await slot(0, 11);
    await t.asService(
      `insert into public.holds (therapist_id, client_id, slot_start, created_at, confirmed_at)
       values ($1, $2, $3::timestamptz, now() - interval '30 hours', now() - interval '25 hours')`,
      [user("therapist1"), id.client2, at11],
    );
    await expect(holdSlot("scheduler1", "therapist2", at11, id.client2)).rejects.toThrow(/CLIENT_BUSY/);
    expect(await holdsOf(id.client2, at11)).toHaveLength(1);
    expect(await holdSlot("scheduler1", "therapist2", at11, id.client3)).toHaveLength(1);
  });

  it("AC-HOLD-26: прострочене утримання client1 у therapist1 не заважає утримати therapist2 на той самий час", async () => {
    const at12 = await slot(0, 12);
    await t.asService(
      `insert into public.holds (therapist_id, client_id, slot_start, created_at)
       values ($1, $2, $3::timestamptz, now() - interval '25 hours')`,
      [user("therapist1"), id.client1, at12],
    );

    const [hold] = await holdSlot("scheduler1", "therapist2", at12, id.client1);
    expect(hold.confirmed_at).toBeNull(); // «Held»
    expect(await holdsOf(id.client1, at12)).toHaveLength(2);
  });

  it("AC-HOLD-37: прострочений слот знову утримують за тим самим клієнтом — нове «Held», прострочене зі списку зникає", async () => {
    const at13 = await slot(0, 13);
    await t.asService(
      `insert into public.holds (therapist_id, client_id, slot_start, created_at)
       values ($1, $2, $3::timestamptz, now() - interval '25 hours')`,
      [user("therapist1"), id.client4, at13],
    );

    const [hold] = await holdSlot("scheduler1", "therapist1", at13, id.client4);
    expect(hold.confirmed_at).toBeNull();

    // «Held until» рахується від нового created_at; прострочене утримання того самого клієнта в списку /holds не показано.
    const rows = await t.asService<HoldRow & { client_id: string; therapist_id: string }>(
      `select h.id, h.slot_start::text, h.created_at::text, h.confirmed_at::text, h.client_id, h.therapist_id,
              json_build_object('full_name', c.full_name) as clients
       from public.holds as h join public.clients as c on c.id = h.client_id
       where h.therapist_id = $1 and h.slot_start = $2::timestamptz`,
      [user("therapist1"), at13],
    );
    expect(rows).toHaveLength(2);
    const list = holdsList(
      rows.map((row) => ({ ...toHoldRecord(row), clientId: row.client_id, therapistId: row.therapist_id, therapistName: "" })),
      new Date(),
    );
    expect(list.map((h) => [h.id, h.status])).toEqual([[hold.id, "Held"]]);
  });
});

describe("підтвердження", () => {
  it("AC-HOLD-27: scheduler2 підтверджує утримання, створене scheduler1, — «Confirmed»", async () => {
    const at = await slot(1, 10);
    const [hold] = await holdSlot("scheduler1", "therapist1", at, id.client5);

    await t.asUser(user("scheduler2"), "select public.confirm_hold($1)", [hold.id]);

    const [row] = await t.asService<{ confirmed_at: string | null; created_by: string; confirmed_by: string }>(
      "select confirmed_at, created_by, confirmed_by from public.holds where id = $1",
      [hold.id],
    );
    expect(row.confirmed_at).not.toBeNull();
    expect(row).toMatchObject({ created_by: user("scheduler1"), confirmed_by: user("scheduler2") });
  });

  it("AC-HOLD-36: друге підтвердження того самого утримання — відмова, підтвердження не змінилось", async () => {
    const at = await slot(1, 11);
    const [hold] = await holdSlot("scheduler1", "therapist1", at, id.client1);
    await t.asUser(user("scheduler1"), "select public.confirm_hold($1)", [hold.id]);
    const before = await t.asService<{ confirmed_at: string; confirmed_by: string }>(
      "select confirmed_at::text, confirmed_by from public.holds where id = $1",
      [hold.id],
    );

    await expect(t.asUser(user("scheduler2"), "select public.confirm_hold($1)", [hold.id])).rejects.toThrow(
      /HOLD_CONFIRMED/,
    );
    expect(
      await t.asService("select confirmed_at::text, confirmed_by from public.holds where id = $1", [hold.id]),
    ).toEqual(before);
  });
});
