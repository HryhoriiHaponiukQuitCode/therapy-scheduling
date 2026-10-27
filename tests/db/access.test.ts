// Відмови доступу на рівні бази (impl-client-cards, задача 1): RLS і GRANT на PGlite з усіма міграціями.
// Кожен тест перевіряє і відмову, і що дані не змінились (asService).
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let therapist1: string;
let therapist2: string;
let newuser1: string;
let clientId: string;
let holdOfTherapist2: string;

const count = async (table: "clients" | "holds") => {
  const [row] = await t.asService<{ n: number }>(`select count(*)::int as n from public.${table}`);
  return row.n;
};

beforeAll(async () => {
  t = await createTestDb();
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
  newuser1 = t.users["newuser1@example.test"];
  [{ id: clientId }] = await t.asService<{ id: string }>(
    "insert into public.clients (full_name, email) values ('Client Six', 'client6@example.test') returning id",
  );
  // Утримання «Held» у therapist2 на завтра, створене годину тому.
  [{ id: holdOfTherapist2 }] = await t.asService<{ id: string }>(
    `insert into public.holds (therapist_id, slot_start, client_id, created_at)
     values ($1, date_trunc('hour', now()) + interval '1 day', $2, now() - interval '1 hour') returning id`,
    [therapist2, clientId],
  );
}, 60_000);

describe("без входу", () => {
  it("AC-CARD-07: відвідувач без входу не читає клієнтів і утримань і не створює картку", async () => {
    await expect(t.asAnon("select id from public.clients")).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select id from public.holds")).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon("insert into public.clients (full_name, email) values ('X', 'x@example.test')"),
    ).rejects.toThrow(/permission denied/);
    expect(await count("clients")).toBe(1);
    expect(await count("holds")).toBe(1);
  });
});

describe("користувач без ролі", () => {
  it("AC-CARD-11: новий користувач Auth отримує профіль без ролі", async () => {
    // Як реєстрація в Supabase: рядок auth.users → тригер on_auth_user_created створює профіль.
    const id = "b0000000-0000-0000-0000-000000000001";
    await t.db.exec("begin; set local role supabase_auth_admin;");
    await t.db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      id,
      "newuser2@example.test",
      { full_name: "New User Two", role: "admin" }, // роль у метаданих ігнорується
    ]);
    await t.db.exec("commit");
    const [{ role }] = await t.asService<{ role: string | null }>(
      "select role from public.profiles where id = $1",
      [id],
    );
    expect(role).toBeNull();
  });

  it("AC-CARD-11: користувач без ролі не бачить жодних клієнтів чи утримань", async () => {
    expect(await t.asUser(newuser1, "select id from public.clients")).toHaveLength(0);
    expect(await t.asUser(newuser1, "select id from public.clients where id = $1", [clientId])).toHaveLength(0);
    expect(await t.asUser(newuser1, "select id from public.holds")).toHaveLength(0);
  });

  it("AC-CARD-11: користувач без ролі не створює картку й не ставить собі роль", async () => {
    await expect(
      t.asUser(newuser1, "insert into public.clients (full_name, email) values ('X', 'x@example.test')"),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.asUser(newuser1, "update public.profiles set role = 'admin' where id = $1", [newuser1]),
    ).rejects.toThrow(/permission denied/);
    const [{ role }] = await t.asService<{ role: string | null }>(
      "select role from public.profiles where id = $1",
      [newuser1],
    );
    expect(role).toBeNull();
    expect(await count("clients")).toBe(1);
  });
});

describe("терапевт і сторінки планувальника", () => {
  it("AC-HOLD-44: терапевт не бачить утримань іншого терапевта, їхніх клієнтів і не змінює утримань", async () => {
    expect(
      await t.asUser(therapist1, "select id from public.holds where therapist_id = $1", [therapist2]),
    ).toHaveLength(0);
    expect(await t.asUser(therapist1, "select id, email from public.clients")).toHaveLength(0);
    await expect(t.asUser(therapist1, "select public.confirm_hold($1)", [holdOfTherapist2])).rejects.toThrow(
      /NOT_STAFF_CONFIRM/,
    );
    await expect(
      t.asUser(therapist1, "update public.holds set confirmed_at = now() where id = $1", [holdOfTherapist2]),
    ).rejects.toThrow(/permission denied/);
    const [hold] = await t.asService<{ confirmed_at: string | null }>(
      "select confirmed_at from public.holds where id = $1",
      [holdOfTherapist2],
    );
    expect(hold.confirmed_at).toBeNull();
    expect(await count("holds")).toBe(1);
  });
});
