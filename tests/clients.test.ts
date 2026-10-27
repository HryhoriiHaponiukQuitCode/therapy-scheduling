import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BIRTH_DATE_MESSAGE,
  CHILD_DUPLICATE_MESSAGE,
  CHILD_NAME_MESSAGE,
  CLIENT_DUPLICATE_MESSAGE,
  CLIENT_FORBIDDEN_MESSAGE,
  CLIENT_INVALID_MESSAGE,
  EMPTY_CLIENT_CARD,
  GUARDIAN_MESSAGE,
  LANGUAGE_MESSAGE,
  validateClientCard,
  type ClientCardValues,
} from "@/lib/clients";

// Дія createClientCard з підміненим клієнтом Supabase: тест перевіряє порядок (сесія → роль → дані → insert) і тексти
// PM. Саму базу (RLS, constraint, тригер, індекси) перевіряє tests/db/client-cards.test.ts на PGlite.
const supabaseMock = vi.hoisted(() => ({
  insert: vi.fn(),
  getClaims: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    from: (table: string) => ({
      insert: (row: unknown) => supabaseMock.insert(table, row),
      // getCurrentUser: profiles.select(…).eq("id", …).maybeSingle()
      select: () => ({ eq: () => ({ maybeSingle: supabaseMock.profile }) }),
    }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

const { createClientCard } = await import("@/app/(app)/clients/actions");

const TODAY = "2026-11-03";
const adult = (fullName: string, email: string): ClientCardValues => ({
  ...EMPTY_CLIENT_CARD,
  client_type: "adult",
  full_name: fullName,
  birth_date: "1990-05-14",
  session_language: "English",
  email,
});
const child = (patch: Partial<ClientCardValues> = {}): ClientCardValues => ({
  ...EMPTY_CLIENT_CARD,
  client_type: "child",
  full_name: "Client Seven",
  birth_date: "2015-03-02",
  session_language: "Spanish",
  guardian_name: "Guardian Seven",
  guardian_email: "guardian7@example.test",
  ...patch,
});

function form(values: ClientCardValues) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const run = (values: ClientCardValues) => createClientCard({ status: "idle" }, form(values));

beforeEach(() => {
  // 2026-11-03 12:00 у America/Los_Angeles — «сьогодні» для дії.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T20:00:00Z"));
  supabaseMock.insert.mockReset();
  supabaseMock.insert.mockResolvedValue({ error: null });
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: "scheduler-1" } } });
  supabaseMock.profile.mockResolvedValue({
    data: { email: "scheduler1@example.test", full_name: "Scheduler One", role: "scheduler" },
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("картка дорослого", () => {
  it("AC-CARD-01: scheduler1 створює картку дорослого Client Six з усіма даними анкети", async () => {
    const state = await run({ ...adult("Client Six", "client6@example.test") });

    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", {
      client_type: "adult",
      full_name: "Client Six",
      birth_date: "1990-05-14",
      session_language: "English",
      email: "client6@example.test",
      guardian_name: null,
      guardian_email: null,
    });
    expect(state).toMatchObject({ status: "success", message: 'Client "Client Six" created.' });
  });

  it("AC-HOLD-10: планувальник створює клієнта «Client Three» з client3@example.test у повній формі", async () => {
    const state = await run(adult("Client Three", "client3@example.test"));
    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", expect.objectContaining({ email: "client3@example.test" }));
    expect(state.status).toBe("success");
  });

  it("AC-HOLD-11: порожнє ім'я — картку не створено, повідомлення PM біля імені, введене лишається", async () => {
    const values = adult("", "client3@example.test");
    const state = await run(values);

    expect(supabaseMock.insert).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: null, errors: { full_name: CLIENT_INVALID_MESSAGE }, values });
  });

  it("AC-HOLD-15: email без знака @ — картку не створено, повідомлення PM", async () => {
    const state = await run(adult("Client Three", "client3example.test"));
    expect(supabaseMock.insert).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", errors: { email: "Enter the client's name and a valid email." } });
  });

  it("AC-HOLD-39: інші некоректні email — у кожному випадку картку не створено", () => {
    for (const email of ["client3@example", "client3@@example.test", "@example.test", "client 3@example.test"]) {
      expect(validateClientCard(adult("Client Three", email), TODAY)).toEqual({
        ok: false,
        errors: { email: CLIENT_INVALID_MESSAGE },
      });
    }
  });

  it("AC-HOLD-35: email « Client3@Example.TEST » зберігається як client3@example.test", async () => {
    await run(adult("Client Three", " Client3@Example.TEST "));
    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", expect.objectContaining({ email: "client3@example.test" }));
  });

  it("AC-HOLD-41: ім'я лише з пробілів — порожнє; « Client Four » зберігається як «Client Four»", async () => {
    expect(validateClientCard(adult("   ", "client5@example.test"), TODAY)).toEqual({
      ok: false,
      errors: { full_name: CLIENT_INVALID_MESSAGE },
    });
    await run(adult(" Client Four ", "client4@example.test"));
    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", expect.objectContaining({ full_name: "Client Four" }));
  });

  it("AC-HOLD-16: email client1@example.test уже існує — повідомлення PM, введене лишається", async () => {
    supabaseMock.insert.mockResolvedValue({
      error: { code: "23505", message: 'duplicate key value violates unique constraint "clients_email_lower_key"' },
    });
    const values = adult("Client One Again", "client1@example.test");
    const state = await run(values);

    expect(state).toEqual({ status: "error", message: CLIENT_DUPLICATE_MESSAGE, errors: {}, values });
    expect(CLIENT_DUPLICATE_MESSAGE).toBe("A client with this email already exists.");
  });

  it("AC-HOLD-34: « Client1@Example.TEST » перевіряється як client1@example.test — той самий дублікат", async () => {
    supabaseMock.insert.mockResolvedValue({
      error: { code: "23505", message: 'duplicate key value violates unique constraint "clients_email_lower_key"' },
    });
    const state = await run(adult("Client One", " Client1@Example.TEST "));

    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", expect.objectContaining({ email: "client1@example.test" }));
    expect(state).toMatchObject({ status: "error", message: CLIENT_DUPLICATE_MESSAGE });
  });
});

describe("картка дитини", () => {
  it("картка дитини з опікуном: без власного email, email опікуна малими літерами", async () => {
    await run(child({ guardian_email: " Guardian7@Example.TEST " }));
    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", {
      client_type: "child",
      full_name: "Client Seven",
      birth_date: "2015-03-02",
      session_language: "Spanish",
      email: null,
      guardian_name: "Guardian Seven",
      guardian_email: "guardian7@example.test",
    });
  });

  it("AC-CARD-03: немає імені чи email опікуна — картку не створено, повідомлення PM, дані лишаються", async () => {
    for (const patch of [{ guardian_name: "" }, { guardian_email: "" }, { guardian_email: "guardian8example.test" }]) {
      const values = child({ full_name: "Client Eight", birth_date: "2016-01-10", session_language: "English", ...patch });
      const state = await run(values);
      expect(state).toMatchObject({ status: "error", values });
      expect(Object.values(state.status === "error" ? state.errors : {})).toEqual([GUARDIAN_MESSAGE]);
    }
    expect(supabaseMock.insert).not.toHaveBeenCalled();
  });

  it("AC-CARD-12: порожнє ім'я, дата 2026-11-04 і без мови — три повідомлення біля полів одразу, дані лишаються", async () => {
    const values = child({
      full_name: "",
      birth_date: "2026-11-04",
      session_language: "",
      guardian_name: "Guardian Eight",
      guardian_email: "guardian8@example.test",
    });
    const state = await run(values);

    expect(supabaseMock.insert).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: "error",
      message: null,
      errors: {
        full_name: "Enter the client's name.",
        birth_date: "Enter a date of birth that is not in the future.",
        session_language: "Select a session language.",
      },
      values,
    });
    expect([CHILD_NAME_MESSAGE, BIRTH_DATE_MESSAGE, LANGUAGE_MESSAGE]).toHaveLength(3);
  });

  it("AC-CARD-12: дата народження, що дорівнює сьогоднішній, коректна", () => {
    expect(validateClientCard(child({ birth_date: TODAY }), TODAY).ok).toBe(true);
  });

  it("AC-CARD-13: дублікат дитини — повідомлення PM, введене лишається у формі", async () => {
    supabaseMock.insert.mockResolvedValue({
      error: { code: "23505", message: 'duplicate key value violates unique constraint "clients_child_identity_key"' },
    });
    const values = child({ full_name: " client seven ", session_language: "English" });
    const state = await run(values);

    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", expect.objectContaining({ full_name: "client seven" }));
    expect(state).toEqual({ status: "error", message: "A client with these details already exists.", errors: {}, values });
    expect(CHILD_DUPLICATE_MESSAGE).toBe("A client with these details already exists.");
  });
});

describe("права", () => {
  it("AC-CARD-06: терапевт пробує створити картку в обхід сторінки — insert не викликано, відмова PM", async () => {
    supabaseMock.profile.mockResolvedValue({
      data: { email: "therapist1@example.test", full_name: "Therapist One", role: "therapist" },
      error: null,
    });
    const values = adult("Client Ten", "client10@example.test");
    const state = await run(values);

    expect(supabaseMock.insert).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: CLIENT_FORBIDDEN_MESSAGE, errors: {}, values });
    expect(CLIENT_FORBIDDEN_MESSAGE).toBe("Only schedulers and admins can create client cards.");
  });
});
