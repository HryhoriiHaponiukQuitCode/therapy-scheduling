// Хто бачить картки клієнтів (impl-client-cards, задача 3): RLS clients_select_staff і clients_select_own_therapist на
// PGlite з усіма міграціями. Час — відносно now() бази: утримання створюємо через asService з потрібними
// created_at, slot_start і confirmed_at. Відмови перевіряють і незмінні дані (asService).
import { beforeAll, describe, expect, it } from "vitest";
import {
  CLIENT_NO_ACCESS_MESSAGE,
  CLIENT_NOT_FOUND_MESSAGE,
  emptyClientsMessage,
  missingCardMessage,
} from "@/lib/clients";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
const id: Record<string, string> = {};
const user = (email: string) => t.users[`${email}@example.test`];

const names = (rows: { full_name: string }[]) => rows.map((r) => r.full_name).sort();

async function card(name: string, child = false) {
  const [{ id: clientId }] = await t.asService<{ id: string }>(
    child
      ? `insert into public.clients (client_type, full_name, birth_date, session_language, guardian_name, guardian_email)
         values ('child', $1, '2015-03-02', 'Spanish', 'Guardian Seven', 'guardian7@example.test') returning id`
      : `insert into public.clients (full_name, email, birth_date, session_language)
         values ($1, lower(replace($1, ' ', '')) || '@example.test', '1990-05-14', 'English') returning id`,
    [name],
  );
  return clientId;
}

// slot і created — SQL-вирази відносно now(); confirmed — чи підтверджено.
async function hold(therapist: string, clientId: string, slot: string, created: string, confirmed = false) {
  await t.asService(
    `insert into public.holds (therapist_id, client_id, slot_start, created_at, confirmed_at)
     values ($1, $2, ${slot}, ${created}, ${confirmed ? "now() - interval '1 hour'" : "null"})`,
    [therapist, clientId],
  );
}

const HOUR = "date_trunc('hour', now())";

beforeAll(async () => {
  t = await createTestDb();
  id.client6 = await card("Client Six");
  id.client7 = await card("Client Seven", true);
  id.client8 = await card("Client Eight");
  id.client9 = await card("Client Nine");
  id.client10 = await card("Client Ten");
  const therapist1 = user("therapist1");
  // client6 — «Held» у therapist1, слот через 2 дні, утримано годину тому.
  await hold(therapist1, id.client6, `${HOUR} + interval '2 days'`, "now() - interval '1 hour'");
  // client7 — «Confirmed» у therapist1, слот учора (минулий сеанс).
  await hold(therapist1, id.client7, `${HOUR} - interval '1 day'`, "now() - interval '2 days'", true);
  // client8 — утримання у therapist1 прострочене (створене 25 годин тому), слот ще попереду.
  await hold(therapist1, id.client8, `${HOUR} + interval '2 days'`, "now() - interval '25 hours'");
  // client9 — «Held» лише в therapist2.
  await hold(user("therapist2"), id.client9, `${HOUR} + interval '2 days'`, "now() - interval '1 hour'");
  // client10 — «Held» у therapist1, не прострочене, але слот уже почався (початок цієї години).
  await hold(therapist1, id.client10, HOUR, "now() - interval '2 hours'");
}, 60_000);

describe("терапевт", () => {
  it("AC-CARD-04: therapist1 бачить лише своїх клієнтів з усіма даними анкети (для дитини — з опікуном)", async () => {
    const rows = await t.asUser<{ full_name: string; guardian_email: string | null; birth_date: string }>(
      user("therapist1"),
      "select full_name, guardian_email, birth_date::text from public.clients",
    );
    expect(names(rows)).toEqual(["Client Seven", "Client Six"]);
    expect(rows.find((r) => r.full_name === "Client Seven")).toMatchObject({
      guardian_email: "guardian7@example.test",
      birth_date: "2015-03-02",
    });
  });

  it("AC-CARD-05: картка клієнта іншого терапевта — жодних даних і картка не змінилась", async () => {
    expect(
      await t.asUser(user("therapist1"), "select id from public.clients where id = $1", [id.client9]),
    ).toHaveLength(0);
    await expect(
      t.asUser(user("therapist1"), "update public.clients set full_name = 'Changed' where id = $1", [id.client9]),
    ).rejects.toThrow(/permission denied/);
    const [row] = await t.asService<{ full_name: string }>("select full_name from public.clients where id = $1", [
      id.client9,
    ]);
    expect(row.full_name).toBe("Client Nine");
    expect(missingCardMessage("therapist")).toBe("You don't have access to this client.");
  });

  it("AC-CARD-08: після прострочення утримання клієнта немає ні в списку, ні за посиланням", async () => {
    const list = await t.asUser<{ full_name: string }>(user("therapist1"), "select full_name from public.clients");
    expect(names(list)).not.toContain("Client Eight");
    expect(
      await t.asUser(user("therapist1"), "select id from public.clients where id = $1", [id.client8]),
    ).toHaveLength(0);
  });

  it("AC-CARD-14: «Held» робить клієнта своїм лише до початку слоту; «Confirmed» — і після", async () => {
    // client10: утримання «Held», але слот почався → недоступний; client7: минулий сеанс «Confirmed» → доступний.
    expect(
      await t.asUser(user("therapist1"), "select id from public.clients where id = $1", [id.client10]),
    ).toHaveLength(0);
    expect(
      await t.asUser(user("therapist1"), "select id from public.clients where id = $1", [id.client7]),
    ).toHaveLength(1);
    expect(CLIENT_NO_ACCESS_MESSAGE).toBe("You don't have access to this client.");
  });

  it("AC-CARD-09: терапевт без утримань і сеансів — жодної картки й повідомлення PM", async () => {
    expect(await t.asUser(user("pm-therapist"), "select id from public.clients")).toHaveLength(0);
    expect(emptyClientsMessage("therapist")).toBe(
      "No clients yet. Clients appear here when a scheduler holds a slot with you.",
    );
  });
});

describe("планувальник і адміністратор", () => {
  it("AC-CARD-10: scheduler2 і admin1 бачать усі картки, у картці дитини — дані опікуна", async () => {
    for (const email of ["scheduler2", "admin1"]) {
      const rows = await t.asUser<{ full_name: string; guardian_name: string | null }>(
        user(email),
        "select full_name, guardian_name from public.clients",
      );
      expect(names(rows)).toEqual(["Client Eight", "Client Nine", "Client Seven", "Client Six", "Client Ten"]);
      expect(rows.find((r) => r.full_name === "Client Seven")?.guardian_name).toBe("Guardian Seven");
    }
  });

  it("AC-CARD-16: посилання на картку, якої не існує, — без даних; планувальнику «doesn't exist», терапевту «no access»", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    for (const email of ["scheduler1", "therapist1"]) {
      expect(await t.asUser(user(email), "select id from public.clients where id = $1", [missing])).toHaveLength(0);
    }
    expect(missingCardMessage("scheduler")).toBe(CLIENT_NOT_FOUND_MESSAGE);
    expect(missingCardMessage("admin")).toBe("This client card doesn't exist.");
    expect(missingCardMessage("therapist")).toBe(CLIENT_NO_ACCESS_MESSAGE);
  });

  it("AC-CARD-15: у практиці ще немає карток — порожній список і повідомлення PM", async () => {
    const fresh = await createTestDb();
    for (const email of ["scheduler1", "admin1"]) {
      expect(await fresh.asUser(fresh.users[`${email}@example.test`], "select id from public.clients")).toHaveLength(0);
    }
    expect(emptyClientsMessage("scheduler")).toBe("No clients yet. Create a client card from an intake form.");
    expect(emptyClientsMessage("admin")).toBe("No clients yet. Create a client card from an intake form.");
  }, 60_000);
});
