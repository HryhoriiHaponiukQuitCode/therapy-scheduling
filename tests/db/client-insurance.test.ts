// Статус перевірки страхування на рівні бази (impl-insurance-status, задача 1): колонка insurance_status,
// default і check з міграції 20261107181916_client_insurance_status.sql на PGlite з усіма міграціями.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

const MIGRATION = readFileSync(
  new URL("../../supabase/migrations/20261107181916_client_insurance_status.sql", import.meta.url),
  "utf8",
);

const INSERT = `insert into public.clients
  (client_type, full_name, birth_date, session_language, email)
  values ('adult', $1, '1990-05-14', 'English', $2) returning id`;

let t: TestDb;
let scheduler1: string;

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
}, 60_000);

describe("статус страхування в картці", () => {
  it("AC-INS-01: нова картка без позначки має статус not_set", async () => {
    const [{ id }] = await t.asUser<{ id: string }>(scheduler1, INSERT, ["Client Eleven", "client11@example.test"]);
    const [card] = await t.asUser<{ insurance_status: string }>(
      scheduler1,
      "select insurance_status from public.clients where id = $1",
      [id],
    );
    expect(card).toEqual({ insurance_status: "not_set" });
  });

  it("AC-INS-01: картка, створена до зрізу 3, після міграції має статус not_set", async () => {
    // Відтворюємо базу до міграції в одній транзакції: прибираємо колонку, вставляємо картку зрізу 2, застосовуємо
    // ту саму міграцію ще раз і відкочуємо все. Так перевіряємо саме default для наявних рядків.
    await t.db.exec("begin");
    try {
      await t.db.exec("alter table public.clients drop column insurance_status");
      const inserted = await t.db.query<{ id: string }>(INSERT, ["Client Twelve", "client12@example.test"]);
      await t.db.exec(MIGRATION);
      const { rows } = await t.db.query<{ insurance_status: string }>(
        "select insurance_status from public.clients where id = $1",
        [inserted.rows[0].id],
      );
      expect(rows).toEqual([{ insurance_status: "not_set" }]);
    } finally {
      await t.db.exec("rollback");
    }
  });

  it("база приймає лише чотири значення статусу", async () => {
    const [{ id }] = await t.asUser<{ id: string }>(scheduler1, INSERT, ["Client Thirteen", "client13@example.test"]);
    await expect(
      t.db.query("update public.clients set insurance_status = 'Verified' where id = $1", [id]),
    ).rejects.toThrow(/clients_insurance_status_check/);
    await expect(
      t.db.query("update public.clients set insurance_status = null where id = $1", [id]),
    ).rejects.toThrow(/null value/);
    for (const status of ["verified", "not_accepted", "private_pay", "not_set"]) {
      await t.db.query("update public.clients set insurance_status = $2 where id = $1", [id, status]);
      const { rows } = await t.db.query("select insurance_status from public.clients where id = $1", [id]);
      expect(rows).toEqual([{ insurance_status: status }]);
    }
  });
});
