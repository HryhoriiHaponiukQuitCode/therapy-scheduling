import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INSURANCE_CHOOSE_MESSAGE,
  INSURANCE_FORBIDDEN_MESSAGE,
  INSURANCE_NO_CLIENT_MESSAGE,
  INSURANCE_SAVE_ERROR_MESSAGE,
  INSURANCE_SAVED_MESSAGE,
} from "@/lib/insurance";

// Дія setInsuranceStatus з підміненим клієнтом Supabase: тест перевіряє порядок (сесія → id → роль → значення → update)
// і тексти PM. Саму базу (колонковий grant, політика clients_update_insurance_staff) перевіряє
// tests/db/client-insurance-update.test.ts на PGlite.
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  getClaims: vi.fn(),
  profile: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    from: (table: string) => {
      supabaseMock.from(table);
      return {
        // getCurrentUser: profiles.select(…).eq("id", …).maybeSingle()
        select: () => ({ eq: () => ({ maybeSingle: supabaseMock.profile }) }),
        // setInsuranceStatus: clients.update({ insurance_status }).eq("id", clientId).select("id")
        update: (row: unknown) => {
          supabaseMock.update(table, row);
          return {
            eq: (column: string, value: unknown) => {
              supabaseMock.eq(column, value);
              return { select: (columns: string) => supabaseMock.select(columns) };
            },
          };
        },
      };
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: supabaseMock.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: supabaseMock.redirect }));

const { setInsuranceStatus } = await import("@/app/(app)/clients/[id]/actions");

const CLIENT6 = "c6000000-0000-4000-8000-000000000006";
const CLIENT7 = "c7000000-0000-4000-8000-000000000007";

function form(value?: string) {
  const data = new FormData();
  if (value !== undefined) data.set("insurance_status", value);
  return data;
}

const run = (clientId: string, value?: string) => setInsuranceStatus(clientId, { status: "idle" }, form(value));

function signedInAs(role: string | null, email = `${role ?? "newuser1"}@example.test`) {
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: `${role ?? "none"}-id`, email } } });
  supabaseMock.profile.mockResolvedValue({ data: { email, full_name: "Synthetic User", role }, error: null });
}

const clientsCalled = () => supabaseMock.from.mock.calls.some(([table]) => table === "clients");

beforeEach(() => {
  for (const fn of [
    supabaseMock.from,
    supabaseMock.update,
    supabaseMock.eq,
    supabaseMock.select,
    supabaseMock.revalidatePath,
    supabaseMock.redirect,
  ]) {
    fn.mockClear();
  }
  supabaseMock.select.mockReset();
  supabaseMock.select.mockImplementation(async () => ({ data: [{ id: CLIENT6 }], error: null }));
  signedInAs("scheduler", "scheduler1@example.test");
});

describe("тексти PM", () => {
  it("AC-INS-02: повідомлення після збереження — «Insurance status saved.»", () => {
    expect(INSURANCE_SAVED_MESSAGE).toBe("Insurance status saved.");
    expect(INSURANCE_FORBIDDEN_MESSAGE).toBe("Only schedulers and admins can change the insurance status.");
    expect(INSURANCE_CHOOSE_MESSAGE).toBe("Choose a status to save.");
    expect(INSURANCE_NO_CLIENT_MESSAGE).toBe("This client doesn't exist.");
    expect(INSURANCE_SAVE_ERROR_MESSAGE).toBe("Could not save the insurance status. Try again later.");
  });
});

describe("планувальник і адміністратор", () => {
  it("AC-INS-02: scheduler1 позначає «Verified» у client6 — update лише insurance_status, «Insurance status saved.», кеш картки скинуто", async () => {
    const state = await run(CLIENT6, "verified");

    expect(supabaseMock.update).toHaveBeenCalledTimes(1);
    expect(supabaseMock.update).toHaveBeenCalledWith("clients", { insurance_status: "verified" });
    expect(supabaseMock.eq).toHaveBeenCalledWith("id", CLIENT6);
    expect(supabaseMock.select).toHaveBeenCalledWith("id");
    expect(supabaseMock.revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT6}`);
    expect(state).toEqual({ status: "success", message: "Insurance status saved." });
  });

  it("AC-INS-03: admin1 змінює статус client7 на «Private pay» — успіх", async () => {
    signedInAs("admin", "admin1@example.test");
    supabaseMock.select.mockImplementation(async () => ({ data: [{ id: CLIENT7 }], error: null }));

    const state = await run(CLIENT7, "private_pay");

    expect(supabaseMock.update).toHaveBeenCalledWith("clients", { insurance_status: "private_pay" });
    expect(supabaseMock.eq).toHaveBeenCalledWith("id", CLIENT7);
    expect(supabaseMock.revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT7}`);
    expect(state).toEqual({ status: "success", message: INSURANCE_SAVED_MESSAGE });
  });

  it("AC-INS-02: «Not set», порожнє або невідоме значення — нічого не збережено, «Choose a status to save.»", async () => {
    for (const value of ["not_set", undefined, "", "Verified", "toString"]) {
      const state = await run(CLIENT6, value);
      expect(state).toEqual({ status: "error", message: INSURANCE_CHOOSE_MESSAGE });
    }
    expect(supabaseMock.update).not.toHaveBeenCalled();
    expect(supabaseMock.revalidatePath).not.toHaveBeenCalled();
  });

  it("AC-INS-02: посилання з не-UUID — «This client doesn't exist.» без запиту до clients", async () => {
    for (const id of ["client6", "abc", "", `${CLIENT6}x`]) {
      const state = await run(id, "verified");
      expect(state).toEqual({ status: "error", message: INSURANCE_NO_CLIENT_MESSAGE });
    }
    expect(clientsCalled()).toBe(false);
    expect(supabaseMock.update).not.toHaveBeenCalled();
  });

  it("AC-INS-02: картки немає (update змінив 0 рядків) — «This client doesn't exist.», кеш не скинуто", async () => {
    supabaseMock.select.mockImplementation(async () => ({ data: [], error: null }));

    const state = await run(CLIENT6, "verified");

    expect(supabaseMock.update).toHaveBeenCalledTimes(1);
    expect(state).toEqual({ status: "error", message: INSURANCE_NO_CLIENT_MESSAGE });
    expect(supabaseMock.revalidatePath).not.toHaveBeenCalled();
  });

  it("AC-INS-02: помилка бази — «Could not save the insurance status. Try again later.», без «saved»", async () => {
    supabaseMock.select.mockImplementation(async () => ({
      data: null,
      error: { code: "42501", message: 'new row violates row-level security policy for table "clients"' },
    }));

    const state = await run(CLIENT6, "verified");

    expect(state).toEqual({ status: "error", message: INSURANCE_SAVE_ERROR_MESSAGE });
    expect(supabaseMock.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("права", () => {
  it("AC-INS-05: therapist1 викликає дію напряму — update не викликано, відмова PM", async () => {
    signedInAs("therapist", "therapist1@example.test");

    const state = await run(CLIENT6, "verified");

    expect(state).toEqual({ status: "error", message: INSURANCE_FORBIDDEN_MESSAGE });
    expect(supabaseMock.update).not.toHaveBeenCalled();
    expect(clientsCalled()).toBe(false);
    expect(supabaseMock.revalidatePath).not.toHaveBeenCalled();
  });

  it("AC-INS-05: користувач без ролі викликає дію напряму — update не викликано, відмова PM", async () => {
    signedInAs(null, "newuser1@example.test");

    const state = await run(CLIENT6, "verified");

    expect(state).toEqual({ status: "error", message: INSURANCE_FORBIDDEN_MESSAGE });
    expect(supabaseMock.update).not.toHaveBeenCalled();
  });

  it("AC-INS-06: без входу — переадресація на /login, до clients не звертаємось", async () => {
    supabaseMock.getClaims.mockResolvedValue({ data: { claims: null } });

    await expect(run(CLIENT6, "verified")).rejects.toThrow("redirect:/login");

    expect(supabaseMock.redirect).toHaveBeenCalledWith("/login");
    expect(clientsCalled()).toBe(false);
    expect(supabaseMock.update).not.toHaveBeenCalled();
    expect(supabaseMock.revalidatePath).not.toHaveBeenCalled();
  });
});
