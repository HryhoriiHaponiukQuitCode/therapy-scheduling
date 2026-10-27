// Картка клієнта на рівні бази (impl-client-cards, задача 2): RLS, constraint, тригер нової картки й унікальні
// індекси на PGlite з усіма міграціями. Кожна відмова перевіряє й незмінні дані (asService).
import { beforeAll, describe, expect, it } from "vitest";
import { EMPTY_CLIENT_CARD, validateClientCard } from "@/lib/clients";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let scheduler1: string;
let scheduler2: string;
let therapist1: string;

const INSERT = `insert into public.clients
  (client_type, full_name, birth_date, session_language, email, guardian_name, guardian_email)
  values ($1, $2, $3, $4, $5, $6, $7) returning id`;
type Card = [string, string, string | null, string | null, string | null, string | null, string | null];

const adult = (name: string, email: string): Card => ["adult", name, "1990-05-14", "English", email, null, null];
const child = (name: string, birth: string, guardianEmail: string): Card => [
  "child",
  name,
  birth,
  "Spanish",
  null,
  "Guardian Seven",
  guardianEmail,
];

const count = async () => {
  const [row] = await t.asService<{ n: number }>("select count(*)::int as n from public.clients");
  return row.n;
};

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
  scheduler2 = t.users["scheduler2@example.test"];
  therapist1 = t.users["therapist1@example.test"];
  await t.asUser(scheduler1, INSERT, adult("Client One", "client1@example.test"));
  await t.asUser(scheduler1, INSERT, child("Client Seven", "2015-03-02", "guardian7@example.test"));
}, 60_000);

describe("створення картки", () => {
  it("AC-CARD-01: планувальник створює картку дорослого з усіма даними анкети", async () => {
    const [{ id }] = await t.asUser<{ id: string }>(scheduler1, INSERT, adult("Client Six", "client6@example.test"));
    const [card] = await t.asService("select client_type, full_name, birth_date::text, session_language, email from public.clients where id = $1", [id]);
    expect(card).toEqual({
      client_type: "adult",
      full_name: "Client Six",
      birth_date: "1990-05-14",
      session_language: "English",
      email: "client6@example.test",
    });
  });

  it("AC-CARD-06: терапевт не створює картку навіть запитом в обхід сторінки", async () => {
    const before = await count();
    // Без RETURNING: інакше вставку зупинила б ще й select-політика, і тест не перевіряв би саме clients_insert_staff.
    await expect(
      t.asUser(therapist1, INSERT.replace(" returning id", ""), adult("Client Ten", "client10@example.test")),
    ).rejects.toThrow(
      /row-level security/,
    );
    expect(await count()).toBe(before);
  });
});

describe("перевірки полів у базі", () => {
  it("AC-CARD-12: дата народження пізніша за сьогодні або без мови — картку не створено", async () => {
    const before = await count();
    const [{ tomorrow }] = await t.asService<{ tomorrow: string }>(
      "select ((now() at time zone 'America/Los_Angeles')::date + 1)::text as tomorrow",
    );
    await expect(
      t.asUser(scheduler1, INSERT, ["child", "Client Eight", tomorrow, "English", null, "Guardian Eight", "guardian8@example.test"]),
    ).rejects.toThrow(/CLIENT_CARD_INVALID/);
    await expect(
      t.asUser(scheduler1, INSERT, ["child", "Client Eight", "2016-01-10", null, null, "Guardian Eight", "guardian8@example.test"]),
    ).rejects.toThrow(/CLIENT_CARD_INVALID/);
    expect(await count()).toBe(before);
  });

  it("AC-CARD-12: дата народження, що дорівнює сьогоднішній, коректна", async () => {
    const [{ today }] = await t.asService<{ today: string }>(
      "select (now() at time zone 'America/Los_Angeles')::date::text as today",
    );
    await expect(
      t.asUser(scheduler1, INSERT, ["child", "Client Newborn", today, "English", null, "Guardian Nine", "guardian9@example.test"]),
    ).resolves.toHaveLength(1);
  });

  it("AC-CARD-03: картка дитини без імені чи email опікуна — не створено", async () => {
    const before = await count();
    await expect(
      t.asUser(scheduler1, INSERT, ["child", "Client Eight", "2016-01-10", "English", null, null, "guardian8@example.test"]),
    ).rejects.toThrow(/clients_contact_by_type/);
    await expect(
      t.asUser(scheduler1, INSERT, ["child", "Client Eight", "2016-01-10", "English", null, "Guardian Eight", "guardian8example.test"]),
    ).rejects.toThrow(/clients_guardian_email_format/);
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-35: email у базі — лише малими літерами без пробілів по краях", async () => {
    await expect(t.asUser(scheduler1, INSERT, adult("Client Three", "Client3@Example.TEST"))).rejects.toThrow(
      /clients_email_normalized/,
    );
    const result = validateClientCard(
      { ...EMPTY_CLIENT_CARD, client_type: "adult", full_name: "Client Three", birth_date: "1990-05-14", session_language: "English", email: " Client3@Example.TEST " },
      "2026-11-03",
    );
    expect(result.ok && result.value.email).toBe("client3@example.test");
    if (!result.ok) return;
    const v = result.value;
    await t.asUser(scheduler1, INSERT, [v.client_type, v.full_name, v.birth_date, v.session_language, v.email, null, null]);
    const [row] = await t.asService<{ email: string }>("select email from public.clients where full_name = 'Client Three'");
    expect(row.email).toBe("client3@example.test");
  });

  it("AC-HOLD-41: ім'я з пробілами по краях база не приймає (дія прибирає їх до запису)", async () => {
    await expect(t.asUser(scheduler1, INSERT, adult(" Client Four ", "client4@example.test"))).rejects.toThrow(
      /clients_full_name_trimmed/,
    );
  });
});

describe("дублікати", () => {
  it("AC-HOLD-16: дорослий з наявним email — другої картки не створено", async () => {
    const before = await count();
    await expect(t.asUser(scheduler2, INSERT, adult("Client One Again", "client1@example.test"))).rejects.toThrow(
      /clients_email_lower_key/,
    );
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-34: email з великими літерами й пробілами після нормалізації — той самий дублікат", async () => {
    const before = await count();
    const result = validateClientCard(
      { ...EMPTY_CLIENT_CARD, client_type: "adult", full_name: "Client One", birth_date: "1990-05-14", session_language: "English", email: " Client1@Example.TEST " },
      "2026-11-03",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await expect(t.asUser(scheduler2, INSERT, adult(result.value.full_name, result.value.email!))).rejects.toThrow(
      /clients_email_lower_key/,
    );
    expect(await count()).toBe(before);
  });

  it("AC-CARD-13: дитина з тим самим ім'ям (без регістру), датою народження й email опікуна — дублікат", async () => {
    const before = await count();
    await expect(
      t.asUser(scheduler2, INSERT, child("client seven", "2015-03-02", "guardian7@example.test")),
    ).rejects.toThrow(/clients_child_identity_key/);
    expect(await count()).toBe(before);
  });

  it("AC-CARD-13: близнюки з різними іменами й той самий email опікуна — дозволено", async () => {
    await expect(
      t.asUser(scheduler2, INSERT, child("Client Seventeen", "2015-03-02", "guardian7@example.test")),
    ).resolves.toHaveLength(1);
  });
});
