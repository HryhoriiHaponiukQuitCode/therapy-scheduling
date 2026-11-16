// Денний ліміт чернеток з тексту звернення (AC-INTAKE-08): public.take_intake_draft_quota() на PGlite з усіма
// міграціями. Працівник має 50 чернеток на день практики; далі, як і для терапевта, нового користувача й гостя, —
// «помічник недоступний» (false), і дія не звертається до моделі. Лічильник — у схемі private, клієнтам недоступний.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
const user = (email: string) => t.users[`${email}@example.test`];
const TAKE = "select public.take_intake_draft_quota() as ok";

async function take(userId: string) {
  const [row] = await t.asUser<{ ok: boolean }>(userId, TAKE);
  return row.ok;
}

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

describe("денний ліміт чернеток", () => {
  it("AC-INTAKE-08: планувальник отримує 50 чернеток на день, 51-ша — «помічник недоступний»", async () => {
    const scheduler = user("scheduler1");
    const results: boolean[] = [];
    for (let i = 0; i < 51; i += 1) results.push(await take(scheduler));
    expect(results.slice(0, 50).every(Boolean)).toBe(true);
    expect(results[50]).toBe(false);
    // Ліміт — на користувача: інший працівник ще має свої.
    expect(await take(user("admin"))).toBe(true);
  }, 60_000);

  it("AC-INTAKE-08: терапевт і новий користувач без ролі ліміту не отримують і лічильника не створюють", async () => {
    expect(await take(user("therapist1"))).toBe(false);
    expect(await take(user("newuser1"))).toBe(false);
    // Схема private закрита навіть для service_role: лічильник читаємо власником бази.
    const { rows } = await t.db.query<{ n: number }>(
      "select count(*)::int as n from private.intake_draft_usage where user_id = any($1)",
      [[user("therapist1"), user("newuser1")]],
    );
    expect(rows[0].n).toBe(0);
  });

  it("AC-INTAKE-08: гість не виконує функцію, а лічильник недоступний клієнтам напряму", async () => {
    await expect(t.asAnon(TAKE)).rejects.toThrow(/permission denied/);
    await expect(t.asUser(user("scheduler2"), "select * from private.intake_draft_usage")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      t.asUser(user("scheduler2"), "update private.intake_draft_usage set requests = 0"),
    ).rejects.toThrow(/permission denied/);
  });
});
