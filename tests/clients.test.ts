import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_DUPLICATE_MESSAGE,
  CLIENT_INVALID_MESSAGE,
  validateClient,
} from "@/lib/clients";

// Підмінений клієнт Supabase: тест перевіряє, що дія пише в clients, а не саму базу
// (RLS і constraints перевіряє db-check на одноразовій базі).
const supabaseMock = vi.hoisted(() => ({
  insert: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    from: (table: string) => ({
      insert: (row: unknown) => supabaseMock.insert(table, row),
    }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

const { addClient } = await import("@/app/clients/actions");

function form(fullName: string, email: string) {
  const data = new FormData();
  data.set("full_name", fullName);
  data.set("email", email);
  return data;
}

beforeEach(() => {
  supabaseMock.insert.mockReset();
  supabaseMock.getClaims.mockReset();
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: "scheduler-1" } } });
});

describe("clients", () => {
  it("AC-HOLD-10: планувальник створює клієнта «Client Three» з client3@example.test", async () => {
    supabaseMock.insert.mockResolvedValue({ error: null });

    const state = await addClient({ status: "idle" }, form("Client Three", "client3@example.test"));

    expect(supabaseMock.insert).toHaveBeenCalledWith("clients", {
      full_name: "Client Three",
      email: "client3@example.test",
    });
    expect(state).toEqual({ status: "success", message: 'Client "Client Three" created.' });
    expect(validateClient("Client Three", "client3@example.test")).toEqual({
      ok: true,
      value: { fullName: "Client Three", email: "client3@example.test" },
    });
  });

  it("AC-HOLD-11: порожнє ім'я — клієнта не створено, повідомлення PM", async () => {
    const state = await addClient({ status: "idle" }, form("", "client3@example.test"));

    expect(supabaseMock.insert).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: "Enter the client's name and a valid email." });
    expect(validateClient("   ", "client3@example.test")).toEqual({
      ok: false,
      message: CLIENT_INVALID_MESSAGE,
    });
  });

  it("AC-HOLD-15: email «client3example.test» без знака @ — клієнта не створено, повідомлення PM", async () => {
    const state = await addClient({ status: "idle" }, form("Client Three", "client3example.test"));

    expect(supabaseMock.insert).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: CLIENT_INVALID_MESSAGE });
  });

  it("AC-HOLD-16: email client1@example.test уже існує — клієнта не створено, повідомлення PM", async () => {
    // Унікальний індекс clients_email_lower_key повертає 23505.
    supabaseMock.insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const state = await addClient({ status: "idle" }, form("Client One Again", "client1@example.test"));

    expect(supabaseMock.insert).toHaveBeenCalledTimes(1);
    expect(state).toEqual({ status: "error", message: "A client with this email already exists." });
    expect(CLIENT_DUPLICATE_MESSAGE).toBe("A client with this email already exists.");
  });
});
