import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_OPTIONS_LIMIT,
  CLIENT_SEARCH_MAX,
  clientSearchFilter,
  MORE_CLIENTS_MESSAGE,
  noClientMatchMessage,
} from "@/lib/clients";

// Пошук клієнта під час утримання на /slots (AC-CARD-02): текст у полі «Client» → server action findClients →
// умова PostgREST or() для запиту клієнтів. Сам ilike виконує PostgREST під RLS staff; тут перевіряємо, що q
// доходить до запиту, біля дитини видно опікуна, а підказки й межі (50 клієнтів, лише staff) — ті самі.
const mocks = vi.hoisted(() => ({ supabase: null as unknown, user: null as { role: string | null } | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.supabase }));
vi.mock("@/lib/roles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/roles")>()),
  getCurrentUser: async () => mocks.user,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { CLIENTS_ERROR_MESSAGE, loadDayView, searchClients, toClientChoices, toClientOptions, toSelectOptions } =
  await import("@/app/(app)/slots/data");
const { findClients } = await import("@/app/(app)/slots/actions");
const { HOLD_MESSAGES } = await import("@/lib/holds");

beforeEach(() => {
  mocks.supabase = null;
  mocks.user = null;
});

// Підмінений клієнт Supabase: кожен ланцюжок запиту — thenable з даними таблиці; виклики or() записуємо.
function fakeSupabase(tables: Record<string, unknown[]>) {
  const orCalls: { table: string; filter: string }[] = [];
  const limits: { table: string; count: number }[] = [];
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "gte", "gt", "lt", "order"]) {
      builder[method] = () => builder;
    }
    builder.limit = (count: number) => {
      limits.push({ table, count });
      return builder;
    };
    builder.or = (filter: string) => {
      orCalls.push({ table, filter });
      return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: tables[table] ?? [], error: null });
    return builder;
  };
  return { client: { from } as never, orCalls, limits };
}

const CLIENT7 = {
  id: "c7777777-7777-4777-8777-777777777777",
  full_name: "Client Seven",
  client_type: "child",
  guardian_email: "guardian7@example.test",
};

describe("пошук клієнта під час утримання", () => {
  it("AC-CARD-02: client7 шукають за email опікуна guardian7@example.test, біля client7 — email опікуна", async () => {
    const { client, orCalls } = fakeSupabase({ clients: [CLIENT7] });
    mocks.supabase = client;
    mocks.user = { role: "scheduler" };

    const choices = await findClients(" guardian7@example.test ");

    expect(orCalls).toEqual([
      {
        table: "clients",
        filter:
          'full_name.ilike."*guardian7@example.test*",email.ilike."*guardian7@example.test*",guardian_email.ilike."*guardian7@example.test*"',
      },
    ]);
    expect(choices).toEqual({
      options: [{ value: CLIENT7.id, label: "Client Seven", hint: "Child · guardian guardian7@example.test" }],
      notice: null,
      error: null,
    });
  });

  it("шукати клієнтів може лише staff: терапевт отримує відмову без запиту до бази", async () => {
    const { client, orCalls, limits } = fakeSupabase({ clients: [CLIENT7] });
    mocks.supabase = client;
    mocks.user = { role: "therapist" };

    await expect(findClients("guardian7")).resolves.toEqual({ options: [], notice: null, error: HOLD_MESSAGES.NOT_STAFF });
    expect(orCalls).toEqual([]);
    expect(limits).toEqual([]);
  });

  it("сторінка вантажить перших клієнтів без фільтра; у дорослого підказки опікуна немає", async () => {
    const { client, orCalls } = fakeSupabase({
      profiles: [{ id: "t1", full_name: "Therapist One", email: "therapist1@example.test" }],
    });
    const view = await loadDayView(client, { therapists: [], date: "2026-11-03" });

    expect(orCalls).toEqual([]);
    expect(view.clients).toEqual({ q: "", clients: [], truncated: false, error: false });
    expect(clientSearchFilter("   ")).toBeNull();
    const [adult] = toClientOptions([
      { id: "c1", full_name: "client1", client_type: "adult", guardian_email: null },
    ]);
    expect(toSelectOptions([adult])).toEqual([{ value: "c1", label: "client1", hint: undefined }]);
  });

  it("службові символи or() у q беруться в лапки, лапки й зворотний слеш екрануються", () => {
    expect(clientSearchFilter('a,b) "x\\')).toBe(
      'full_name.ilike."*a,b) \\"x\\\\*",email.ilike."*a,b) \\"x\\\\*",guardian_email.ilike."*a,b) \\"x\\\\*"',
    );
    expect(noClientMatchMessage(" nobody ")).toBe('No clients match "nobody".');
  });

  it("довгий q обрізається один раз: шукаємо й показуємо ті самі 100 символів", async () => {
    const { client, orCalls } = fakeSupabase({});
    const search = await searchClients(client, "x".repeat(150));

    expect(search.q).toBe("x".repeat(CLIENT_SEARCH_MAX));
    expect(orCalls[0].filter).toContain(`"*${search.q}*"`);
    expect(toClientChoices(search).notice).toBe(`No clients match "${"x".repeat(CLIENT_SEARCH_MAX)}".`);
  });

  it("у виборі не більше 50 клієнтів, і поле підказує, що знайдено більше", async () => {
    const many = Array.from({ length: CLIENT_OPTIONS_LIMIT + 1 }, (_, i) => ({
      id: `c${i}`,
      full_name: `Client ${i}`,
      client_type: "adult",
      guardian_email: null,
    }));
    const { client, limits } = fakeSupabase({ clients: many });
    const search = await searchClients(client, "client");

    expect(limits).toContainEqual({ table: "clients", count: CLIENT_OPTIONS_LIMIT + 1 });
    expect(search.clients).toHaveLength(CLIENT_OPTIONS_LIMIT);
    expect(search.truncated).toBe(true);
    const choices = toClientChoices(search);
    expect(choices.options).toHaveLength(CLIENT_OPTIONS_LIMIT);
    expect(choices.notice).toBe(MORE_CLIENTS_MESSAGE);
    expect(MORE_CLIENTS_MESSAGE).toBe("Showing the first 50 clients. Refine the search to find others.");
  });

  it("помилка запиту клієнтів — повідомлення замість варіантів", () => {
    expect(toClientChoices({ q: "x", clients: [], truncated: false, error: true })).toEqual({
      options: [],
      notice: null,
      error: CLIENTS_ERROR_MESSAGE,
    });
  });
});
