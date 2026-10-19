import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDaySlots, practiceTimeToUtc, type HoldRecord } from "@/lib/slots";

// Підмінений клієнт Supabase: тест перевіряє, що дії викликають hold_slot / confirm_hold і показують тексти PM.
// Прострочення й блокування в private.confirm_hold перевіряє db-check (міграція на одноразовій базі).
const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  getClaims: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    rpc: supabaseMock.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: supabaseMock.profile }) }) }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

const { confirmHold, holdSlot } = await import("@/app/slots/actions");

function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

const HOLD_ID = "a1111111-1111-4111-8111-111111111111";
const THERAPIST1 = "11111111-1111-4111-8111-111111111111";
const CLIENT1 = "c1111111-1111-4111-8111-111111111111";
const SLOT_10 = at("2026-11-03", 10);

function confirmForm(holdId = HOLD_ID) {
  const data = new FormData();
  data.set("hold_id", holdId);
  return data;
}

function signedInAs(role: string) {
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: `${role}-id` } } });
  supabaseMock.profile.mockResolvedValue({ data: { email: `${role}@example.test`, full_name: role, role } });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(at("2026-11-02", 16));
  supabaseMock.rpc.mockReset();
  signedInAs("scheduler");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("slot-holds: підтвердження утримання", () => {
  it("AC-HOLD-12: планувальник підтверджує непрострочене утримання — «Confirmed», без «Held until», слот зайнятий і після 24 годин", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { id: HOLD_ID }, error: null });

    const state = await confirmHold({ status: "idle" }, confirmForm());

    expect(supabaseMock.rpc).toHaveBeenCalledWith("confirm_hold", { p_hold_id: HOLD_ID });
    expect(state).toEqual({ status: "success", message: "Hold confirmed. The slot is now a session." });

    const confirmed: HoldRecord = {
      id: HOLD_ID,
      slotStart: SLOT_10,
      createdAt: at("2026-11-02", 14, 30),
      confirmedAt: at("2026-11-02", 16),
      clientName: "client1",
    };
    // Одразу після підтвердження і після межі 24 годин від створення (2026-11-03 14:30).
    for (const now of [at("2026-11-02", 16, 1), at("2026-11-03", 15, 0)]) {
      const [slot] = buildDaySlots({
        date: "2026-11-03",
        availability: [{ start_hour: 10, end_hour: 11 }],
        holds: [confirmed],
        now,
      });
      expect(slot.status).toBe("Confirmed");
      expect(slot.heldUntil).toBeNull();
      expect(slot.holdId).toBeNull();
      expect(slot.canHold).toBe(false);
    }
  });

  it("AC-HOLD-13: прострочене утримання не підтверджується — «This hold has expired. Hold the slot again.»", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: "HOLD_EXPIRED" } });

    const state = await confirmHold({ status: "idle" }, confirmForm());

    expect(state).toEqual({ status: "error", message: "This hold has expired. Hold the slot again." });
  });

  it("AC-HOLD-14: користувач з роллю therapist не підтверджує утримання — повідомлення PM", async () => {
    signedInAs("therapist");

    const state = await confirmHold({ status: "idle" }, confirmForm());

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: "Only schedulers and admins can confirm holds." });
  });

  it("AC-HOLD-19: адміністратор утримує слот за client1 і підтверджує — «Confirmed», як у планувальника", async () => {
    signedInAs("admin");
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: { id: HOLD_ID }, error: null })
      .mockResolvedValueOnce({ data: { id: HOLD_ID }, error: null });

    const holdData = new FormData();
    holdData.set("therapist_id", THERAPIST1);
    holdData.set("slot_start", SLOT_10.toISOString());
    holdData.set("client_id", CLIENT1);
    const held = await holdSlot({ status: "idle" }, holdData);
    const confirmed = await confirmHold({ status: "idle" }, confirmForm());

    expect(held.status).toBe("success");
    expect(confirmed.status).toBe("success");
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "hold_slot", expect.objectContaining({ p_client_id: CLIENT1 }));
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "confirm_hold", { p_hold_id: HOLD_ID });

    const [slot] = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 11 }],
      holds: [
        {
          id: HOLD_ID,
          slotStart: SLOT_10,
          createdAt: at("2026-11-02", 16),
          confirmedAt: at("2026-11-02", 16),
          clientName: "client1",
        },
      ],
      now: at("2026-11-02", 16, 5),
    });
    expect(slot.status).toBe("Confirmed");
  });
});
