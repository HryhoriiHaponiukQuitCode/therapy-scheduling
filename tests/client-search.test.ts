import { describe, expect, it } from "vitest";
import { clientSearchFilter, noClientMatchMessage } from "@/lib/clients";
import { loadDayView, toClientOptions, toSelectOptions } from "@/app/(app)/slots/data";

// Пошук клієнта під час утримання на /slots (AC-CARD-02): GET-параметр q → умова PostgREST or() для запиту клієнтів.
// Сам ilike виконує PostgREST під RLS staff; тут перевіряємо, що q доходить до запиту і біля дитини видно опікуна.

// Підмінений клієнт Supabase: кожен ланцюжок запиту — thenable з даними таблиці; виклики or() записуємо.
function fakeSupabase(tables: Record<string, unknown[]>) {
  const orCalls: { table: string; filter: string }[] = [];
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "gte", "gt", "lt", "order", "limit"]) {
      builder[method] = () => builder;
    }
    builder.or = (filter: string) => {
      orCalls.push({ table, filter });
      return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: tables[table] ?? [], error: null });
    return builder;
  };
  return { client: { from } as never, orCalls };
}

const CLIENT7 = {
  id: "c7777777-7777-4777-8777-777777777777",
  full_name: "Client Seven",
  client_type: "child",
  guardian_email: "guardian7@example.test",
};

describe("пошук клієнта під час утримання", () => {
  it("AC-CARD-02: client7 шукають за email опікуна guardian7@example.test, біля client7 — email опікуна", async () => {
    const { client, orCalls } = fakeSupabase({
      profiles: [{ id: "t1", full_name: "Therapist One", email: "therapist1@example.test" }],
      clients: [CLIENT7],
    });

    const view = await loadDayView(client, { therapists: [], date: "2026-11-03", q: " guardian7@example.test " });

    expect(orCalls).toEqual([
      {
        table: "clients",
        filter:
          'full_name.ilike."*guardian7@example.test*",email.ilike."*guardian7@example.test*",guardian_email.ilike."*guardian7@example.test*"',
      },
    ]);
    expect(view.q).toBe("guardian7@example.test");
    expect(toSelectOptions(view.clients)).toEqual([
      { value: CLIENT7.id, label: "Client Seven", hint: "Child · guardian guardian7@example.test" },
    ]);
  });

  it("без q — усі клієнти без фільтра; у дорослого підказки опікуна немає", async () => {
    const { client, orCalls } = fakeSupabase({
      profiles: [{ id: "t1", full_name: "Therapist One", email: "therapist1@example.test" }],
    });
    await loadDayView(client, { therapists: [], date: "2026-11-03" });

    expect(orCalls).toEqual([]);
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
});
