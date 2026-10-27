// Міграція 20261027212409_remove_non_synthetic_clients: лише синтетичні картки клієнтів (AGENTS.md, «База даних»).
// createTestDb застосовує всі міграції до вставки даних, тож тут міграцію виконуємо ще раз — на картках, створених
// після неї: несинтетичні (email чи email опікуна не на example.test) видаляються разом з утриманнями, решта лишається.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

const MIGRATION = readFileSync(
  new URL("../../supabase/migrations/20261027212409_remove_non_synthetic_clients.sql", import.meta.url),
  "utf8",
);

const INSERT = `insert into public.clients
  (client_type, full_name, birth_date, session_language, email, guardian_name, guardian_email)
  values ($1, $2, '2015-03-02', 'English', $3, $4, $5) returning id`;

let t: TestDb;
const ids: Record<string, string> = {};

const hold = (clientId: string, hours: number) =>
  t.asService(
    `insert into public.holds (therapist_id, slot_start, client_id, created_at)
     values ($1, date_trunc('hour', now()) + make_interval(hours => $3), $2, now() - interval '1 hour')`,
    [t.users["therapist1@example.test"], clientId, hours],
  );

beforeAll(async () => {
  t = await createTestDb();
  const add = async (key: string, type: string, email: string | null, guardianEmail: string | null) => {
    const [{ id }] = await t.asService<{ id: string }>(INSERT, [
      type,
      key,
      email,
      guardianEmail ? "Guardian" : null,
      guardianEmail,
    ]);
    ids[key] = id;
  };
  await add("Synthetic Adult", "adult", "client1@example.test", null);
  await add("Synthetic Child", "child", null, "guardian7@example.test");
  // Зарезервовані домени (RFC 2606) замість справжніх адрес.
  await add("Outside Adult", "adult", "someone@example.com", null);
  await add("Outside Child", "child", null, "parent@example.org");
  await hold(ids["Synthetic Adult"], 24);
  await hold(ids["Outside Adult"], 25);

  await t.db.exec(MIGRATION);
}, 60_000);

describe("лише синтетичні картки клієнтів", () => {
  it("картки з email клієнта чи опікуна не на example.test видалено, синтетичні — лишились", async () => {
    const rows = await t.asService<{ full_name: string }>(
      "select full_name from public.clients where id = any($1) order by full_name",
      [Object.values(ids)],
    );
    expect(rows.map((r) => r.full_name)).toEqual(["Synthetic Adult", "Synthetic Child"]);
  });

  it("утримання видаленої картки зникли каскадом, утримання синтетичної — лишилось", async () => {
    const rows = await t.asService<{ client_id: string }>(
      "select client_id from public.holds where client_id = any($1)",
      [Object.values(ids)],
    );
    expect(rows.map((r) => r.client_id)).toEqual([ids["Synthetic Adult"]]);
  });

  it("повторне застосування нічого не змінює", async () => {
    const before = await t.asService("select id from public.clients order by id");
    await t.db.exec(MIGRATION);
    expect(await t.asService("select id from public.clients order by id")).toEqual(before);
  });
});
