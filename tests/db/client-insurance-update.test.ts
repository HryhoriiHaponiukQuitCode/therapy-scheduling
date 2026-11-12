// Хто змінює статус перевірки страхування на рівні бази (impl-insurance-update): колонковий grant update
// (insurance_status) для authenticated і політика clients_update_insurance_staff на PGlite з усіма міграціями.
// Кожен тест має власну картку; початковий статус ставимо через asService, результат перевіряємо від імені
// користувачів і (для відмов) через asService — дані не змінились.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
const user = (email: string) => t.users[`${email}@example.test`];

const HOUR = "date_trunc('hour', now())";
let slotOffset = 1;

// Картка дорослого з початковим статусом страхування (через service_role, в обхід RLS).
async function card(name: string, status = "not_set") {
  const [{ id }] = await t.asService<{ id: string }>(
    `insert into public.clients (full_name, email, birth_date, session_language)
     values ($1, lower(replace($1, ' ', '')) || '@example.test', '1990-05-14', 'English') returning id`,
    [name],
  );
  if (status !== "not_set") {
    await t.asService("update public.clients set insurance_status = $2 where id = $1", [id, status]);
  }
  return id;
}

// «Held» у терапевта: утримано годину тому, слот попереду — клієнт свій для терапевта (AC-CARD-04, AC-CARD-14).
async function hold(therapist: string, clientId: string) {
  slotOffset += 1;
  await t.asService(
    `insert into public.holds (therapist_id, client_id, slot_start, created_at)
     values ($1, $2, ${HOUR} + interval '${slotOffset} days', now() - interval '1 hour')`,
    [therapist, clientId],
  );
}

async function statusAs(userId: string, clientId: string) {
  const rows = await t.asUser<{ insurance_status: string }>(
    userId,
    "select insurance_status from public.clients where id = $1",
    [clientId],
  );
  return rows.map((r) => r.insurance_status);
}

async function storedStatus(clientId: string) {
  const [row] = await t.asService<{ insurance_status: string }>(
    "select insurance_status from public.clients where id = $1",
    [clientId],
  );
  return row.insurance_status;
}

const SET_STATUS = "update public.clients set insurance_status = $2 where id = $1 returning id";

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

describe("планувальник і адміністратор змінюють статус", () => {
  it("AC-INS-02: scheduler1 позначає «Verified» у картці client6 зі статусом not_set — після повторного відкриття verified", async () => {
    const client6 = await card("Client Six Ins Two");
    expect(await statusAs(user("scheduler1"), client6)).toEqual(["not_set"]);

    const updated = await t.asUser<{ id: string }>(user("scheduler1"), SET_STATUS, [client6, "verified"]);

    expect(updated).toEqual([{ id: client6 }]);
    expect(await statusAs(user("scheduler1"), client6)).toEqual(["verified"]);
    expect(await storedStatus(client6)).toBe("verified");
  });

  it("AC-INS-02: позначений статус не можна повернути в «Not set» — відмова RLS (42501), статус не змінився", async () => {
    const client6 = await card("Client Six Ins Back");
    await t.asUser(user("scheduler1"), SET_STATUS, [client6, "verified"]);
    expect(await storedStatus(client6)).toBe("verified");

    await expect(t.asUser(user("scheduler1"), SET_STATUS, [client6, "not_set"])).rejects.toMatchObject({
      code: "42501",
      message: expect.stringMatching(/row-level security/),
    });
    await expect(t.asUser(user("admin1"), SET_STATUS, [client6, "not_set"])).rejects.toMatchObject({
      code: "42501",
      message: expect.stringMatching(/row-level security/),
    });
    expect(await storedStatus(client6)).toBe("verified");
  });

  it("AC-INS-03: admin1 змінює «Verified» на «Private pay» у client7 — admin1 і scheduler2 бачать private_pay", async () => {
    const client7 = await card("Client Seven Ins Three", "verified");

    const updated = await t.asUser<{ id: string }>(user("admin1"), SET_STATUS, [client7, "private_pay"]);

    expect(updated).toEqual([{ id: client7 }]);
    expect(await statusAs(user("admin1"), client7)).toEqual(["private_pay"]);
    expect(await statusAs(user("scheduler2"), client7)).toEqual(["private_pay"]);
  });

  it("AC-INS-02: працівник може змінити лише insurance_status — інші колонки картки не змінюються", async () => {
    const client = await card("Client Six Ins Columns");
    // Колонка статусу оновлюється…
    expect(await t.asUser(user("scheduler1"), SET_STATUS, [client, "not_accepted"])).toEqual([{ id: client }]);
    // …а решта колонок — ні (колонковий grant лише на insurance_status).
    for (const sql of [
      "update public.clients set full_name = 'Changed Name' where id = $1",
      "update public.clients set email = 'changed@example.test' where id = $1",
      "update public.clients set insurance_status = 'verified', full_name = 'Changed Name' where id = $1",
    ]) {
      await expect(t.asUser(user("scheduler1"), sql, [client])).rejects.toThrow(/permission denied/);
      await expect(t.asUser(user("admin1"), sql, [client])).rejects.toThrow(/permission denied/);
    }
    const [row] = await t.asService<{ full_name: string; email: string; insurance_status: string }>(
      "select full_name, email, insurance_status from public.clients where id = $1",
      [client],
    );
    expect(row).toEqual({
      full_name: "Client Six Ins Columns",
      email: "clientsixinscolumns@example.test",
      insurance_status: "not_accepted",
    });
  });
});

describe("терапевт", () => {
  it("AC-INS-04: therapist1 бачить «Not accepted» у картці свого клієнта client6", async () => {
    const client6 = await card("Client Six Ins Four", "not_accepted");
    await hold(user("therapist1"), client6);

    expect(await statusAs(user("therapist1"), client6)).toEqual(["not_accepted"]);
  });

  it("AC-INS-05: therapist1 напряму змінює статус свого client6 на verified — 0 рядків без помилки, scheduler1 бачить not_accepted", async () => {
    const client6 = await card("Client Six Ins Five", "not_accepted");
    await hold(user("therapist1"), client6);
    // Передумова: клієнт справді свій — therapist1 бачить картку.
    expect(await statusAs(user("therapist1"), client6)).toEqual(["not_accepted"]);

    const updated = await t.asUser(user("therapist1"), SET_STATUS, [client6, "verified"]);

    expect(updated).toEqual([]);
    expect(await statusAs(user("scheduler1"), client6)).toEqual(["not_accepted"]);
    expect(await storedStatus(client6)).toBe("not_accepted");
  });

  it("AC-INS-05: therapist2 (клієнт не свій) напряму змінює статус — 0 рядків, статус не змінився", async () => {
    const client6 = await card("Client Six Ins Five Other", "not_accepted");
    await hold(user("therapist1"), client6);

    const updated = await t.asUser(user("therapist2"), SET_STATUS, [client6, "verified"]);

    expect(updated).toEqual([]);
    expect(await statusAs(user("scheduler1"), client6)).toEqual(["not_accepted"]);
  });
});

describe("без входу", () => {
  it("AC-INS-06: відвідувач без входу не читає й не змінює картку client6 — scheduler1 далі бачить verified", async () => {
    const client6 = await card("Client Six Ins Six", "verified");

    await expect(
      t.asAnon("select insurance_status from public.clients where id = $1", [client6]),
    ).rejects.toThrow(/permission denied/);
    await expect(t.asAnon(SET_STATUS, [client6, "not_accepted"])).rejects.toThrow(/permission denied/);

    expect(await statusAs(user("scheduler1"), client6)).toEqual(["verified"]);
  });
});
