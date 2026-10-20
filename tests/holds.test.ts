import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLD_MESSAGES } from "@/lib/holds";
import { buildDaySlots, formatPracticeTime, practiceTimeToUtc, type HoldRecord } from "@/lib/slots";
import { toClientOptions } from "@/app/(app)/slots/data";

// Підмінений клієнт Supabase: тест перевіряє, що дія викликає hold_slot з потрібними даними й показує тексти PM.
// Блокування й перевірки в самій функції private.hold_slot перевіряє db-check (міграція на одноразовій базі).
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

const { holdSlot } = await import("@/app/(app)/slots/actions");

// Момент за годинником практики (America/Los_Angeles).
function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

const THERAPIST1 = "11111111-1111-4111-8111-111111111111";
const SLOT_10 = at("2026-11-03", 10); // слот therapist1 2026-11-03 10:00–11:00

function form(clientId: string, slotStart = SLOT_10) {
  const data = new FormData();
  data.set("therapist_id", THERAPIST1);
  data.set("slot_start", slotStart.toISOString());
  data.set("client_id", clientId);
  return data;
}

function signedInAs(role: string) {
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: `${role}-id` } } });
  supabaseMock.profile.mockResolvedValue({ data: { email: `${role}@example.test`, full_name: role, role } });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(at("2026-11-02", 14, 30));
  supabaseMock.rpc.mockReset();
  signedInAs("scheduler");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("slot-holds: утримання слоту", () => {
  it("AC-HOLD-02: утримання вільного слоту 2026-11-03 10:00 за client1 о 2026-11-02 14:30 — «Held until 2026-11-03 14:30»", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { id: "h1" }, error: null });

    const state = await holdSlot({ status: "idle" }, form("c1111111-1111-4111-8111-111111111111"));

    expect(supabaseMock.rpc).toHaveBeenCalledWith("hold_slot", {
      p_therapist_id: THERAPIST1,
      p_slot_start: SLOT_10.toISOString(),
      p_client_id: "c1111111-1111-4111-8111-111111111111",
    });
    expect(state).toEqual({ status: "success", message: "Slot held for 24 hours." });

    // Після утримання слот більше не вільний для жодного користувача й показує клієнта та «Held until».
    const created: HoldRecord = {
      id: "h1",
      slotStart: SLOT_10,
      createdAt: at("2026-11-02", 14, 30),
      confirmedAt: null,
      clientName: "client1",
    };
    const [slot] = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 11 }],
      holds: [created],
      now: at("2026-11-02", 14, 31),
    });
    expect(slot.status).toBe("Held");
    expect(slot.clientName).toBe("client1");
    expect(formatPracticeTime(slot.heldUntil!)).toBe("2026-11-03 14:30");
    expect(slot.canHold).toBe(false);
  });

  it("AC-HOLD-03: слот уже утримано за client1 — утримання за client2 не створюється, повідомлення PM", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: "SLOT_UNAVAILABLE" } });

    const state = await holdSlot({ status: "idle" }, form("c2222222-2222-4222-8222-222222222222"));

    expect(state).toEqual({ status: "error", message: "This slot is no longer available." });
  });

  it("AC-HOLD-04: двоє планувальників одночасно — рівно одне утримання, інший бачить повідомлення PM", async () => {
    // private.hold_slot тримає pg_advisory_xact_lock на (терапевт, слот): другий виклик бачить перше утримання.
    // Обмеження: тут rpc підмінено, тож тест перевіряє реакцію дії на відповідь бази, а не саме блокування.
    // Одночасність гарантує SQL (міграція 20261019111956_hold_slot.sql); автотестів бази в CI немає (design.md, Risks).
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: { id: "h1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "SLOT_UNAVAILABLE" } });

    const results = await Promise.all([
      holdSlot({ status: "idle" }, form("c1111111-1111-4111-8111-111111111111")),
      holdSlot({ status: "idle" }, form("c2222222-2222-4222-8222-222222222222")),
    ]);

    expect(results.filter((r) => r.status === "success")).toHaveLength(1);
    expect(results.filter((r) => r.status === "error")).toEqual([
      { status: "error", message: "This slot is no longer available." },
    ]);
  });

  it("AC-HOLD-07: слот 2026-11-03 10:00 о 10:05 — утримання не створюється, повідомлення PM", async () => {
    vi.setSystemTime(at("2026-11-03", 10, 5));

    const state = await holdSlot({ status: "idle" }, form("c1111111-1111-4111-8111-111111111111"));

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: "This slot has already started and cannot be held." });
  });

  it("AC-HOLD-08: користувач з роллю therapist — утримання не створюється, повідомлення PM", async () => {
    signedInAs("therapist");

    const state = await holdSlot({ status: "idle" }, form("c1111111-1111-4111-8111-111111111111"));

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: "Only schedulers and admins can hold slots." });
  });

  it("AC-HOLD-17: повторне утримання за client1 о 18:00 — нове не створюється, «Held until 2026-11-03 14:30» не змінюється", async () => {
    vi.setSystemTime(at("2026-11-02", 18));
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: "SLOT_UNAVAILABLE" } });

    const state = await holdSlot({ status: "idle" }, form("c1111111-1111-4111-8111-111111111111"));

    expect(state).toEqual({ status: "error", message: HOLD_MESSAGES.SLOT_UNAVAILABLE });
    const [slot] = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 11 }],
      holds: [
        { id: "h1", slotStart: SLOT_10, createdAt: at("2026-11-02", 14, 30), confirmedAt: null, clientName: "client1" },
      ],
      now: at("2026-11-02", 18),
    });
    expect(formatPracticeTime(slot.heldUntil!)).toBe("2026-11-03 14:30");
  });

  it("AC-HOLD-10: створеного клієнта «Client Three» можна вибрати під час утримання слоту", async () => {
    const options = toClientOptions([
      { id: "c1111111-1111-4111-8111-111111111111", full_name: "client1" },
      { id: "c3333333-3333-4333-8333-333333333333", full_name: "Client Three" },
    ]);
    expect(options).toContainEqual({ id: "c3333333-3333-4333-8333-333333333333", name: "Client Three" });

    supabaseMock.rpc.mockResolvedValue({ data: { id: "h3" }, error: null });
    const state = await holdSlot({ status: "idle" }, form("c3333333-3333-4333-8333-333333333333"));

    expect(supabaseMock.rpc).toHaveBeenCalledWith("hold_slot", expect.objectContaining({ p_client_id: "c3333333-3333-4333-8333-333333333333" }));
    expect(state.status).toBe("success");
  });
});
