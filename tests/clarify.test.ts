import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDaySlots,
  hasFreeSlots,
  holdsList,
  isoWeekday,
  NO_FREE_SLOTS_MESSAGE,
  practiceTimeToUtc,
  type HoldListRecord,
  type HoldRecord,
} from "@/lib/slots";

// Уточнення PM (зміна clarify-slot-hold): AC-HOLD-20, AC-HOLD-22, AC-HOLD-23, AC-HOLD-24 (2026-11-07 — уточнення 26.10).
// Підмінений клієнт Supabase для дії confirmHold; саму перевірку початку слоту в private.confirm_hold
// перевіряє db-check (міграція 20261019195754_confirm_before_start.sql на одноразовій базі).
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

const { confirmHold } = await import("@/app/(app)/slots/actions");

function at(date: string, hour: number, minute = 0): Date {
  return new Date(practiceTimeToUtc(date, hour).getTime() + minute * 60_000);
}

const HOLD_ID = "a1111111-1111-4111-8111-111111111111";

// Утримання слоту therapist1 2026-11-03 10:00–11:00 за client1, створене 2026-11-02 о 14:30.
const holdAt10: HoldRecord = {
  id: HOLD_ID,
  slotStart: at("2026-11-03", 10),
  createdAt: at("2026-11-02", 14, 30),
  confirmedAt: null,
  clientName: "client1",
};

function confirmForm() {
  const data = new FormData();
  data.set("hold_id", `${HOLD_ID}|${holdAt10.slotStart.toISOString()}`);
  return data;
}

beforeEach(() => {
  vi.useFakeTimers();
  supabaseMock.rpc.mockReset();
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: "scheduler-id" } } });
  supabaseMock.profile.mockResolvedValue({
    data: { email: "scheduler1@example.test", full_name: "Scheduler One", role: "scheduler" },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("slot-holds: уточнення PM", () => {
  it("AC-HOLD-20: планувальник 2026-11-03 о 15:00 бачить утримання слоту 2026-11-05 10:00 з client1 і статусом «Expired», слот вільний", () => {
    const hold: HoldListRecord = {
      id: "h-expired",
      slotStart: at("2026-11-05", 10),
      createdAt: at("2026-11-02", 14, 30),
      confirmedAt: null,
      clientName: "client1",
      clientId: "c1",
      therapistId: "t1",
      therapistName: "Therapist One",
    };
    const now = at("2026-11-03", 15);

    // Список утримань /holds.
    expect(holdsList([hold], now).map((h) => [h.id, h.clientName, h.status])).toEqual([["h-expired", "client1", "Expired"]]);
    const [slot] = buildDaySlots({
      date: "2026-11-05",
      availability: [{ start_hour: 10, end_hour: 11 }],
      holds: [hold],
      now,
    });
    expect(slot.status).toBe("Free");
    expect(slot.canHold).toBe(true);
  });

  it("AC-HOLD-22: о 10:00 або пізніше утримання не підтверджується, лишається «Held», повідомлення PM", async () => {
    for (const now of [at("2026-11-03", 10), at("2026-11-03", 10, 30)]) {
      vi.setSystemTime(now);
      supabaseMock.rpc.mockReset();

      const state = await confirmHold({ status: "idle" }, confirmForm());

      // Дія відмовляє сама, до бази (той самий рядок перевіряє private.confirm_hold).
      expect(supabaseMock.rpc).not.toHaveBeenCalled();
      expect(state).toEqual({
        status: "error",
        message: "This slot has already started and cannot be confirmed.",
      });
      const [slot] = buildDaySlots({
        date: "2026-11-03",
        availability: [{ start_hour: 10, end_hour: 11 }],
        holds: [holdAt10],
        now,
      });
      expect(slot.status).toBe("Held");
      expect(slot.canConfirm).toBe(false);
    }
  });

  it("AC-HOLD-23: о 2026-11-03 09:59 утримання підтверджується — «Confirmed»", async () => {
    const now = at("2026-11-03", 9, 59);
    vi.setSystemTime(now);
    supabaseMock.rpc.mockResolvedValue({ data: { id: HOLD_ID }, error: null });

    const [before] = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 11 }],
      holds: [holdAt10],
      now,
    });
    expect(before.canConfirm).toBe(true);

    const state = await confirmHold({ status: "idle" }, confirmForm());
    expect(supabaseMock.rpc).toHaveBeenCalledWith("confirm_hold", { p_hold_id: HOLD_ID });
    expect(state.status).toBe("success");

    const [after] = buildDaySlots({
      date: "2026-11-03",
      availability: [{ start_hour: 10, end_hour: 11 }],
      holds: [{ ...holdAt10, confirmedAt: now }],
      now,
    });
    expect(after.status).toBe("Confirmed");
  });

  it("AC-HOLD-24: у therapist1 немає жодного слоту в суботу 2026-11-07 — лише повідомлення і жодного слоту", () => {
    // Доступність сиду: пн–пт 09:00–16:00; субота — без вікон.
    const seed = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_hour: 9, end_hour: 17 }));
    const saturday = isoWeekday("2026-11-07");
    const slots = buildDaySlots({
      date: "2026-11-07",
      availability: seed.filter((window) => window.weekday === saturday),
      holds: [],
      now: at("2026-11-05", 12),
    });

    expect(slots).toEqual([]);
    expect(hasFreeSlots(slots)).toBe(false);
    expect(NO_FREE_SLOTS_MESSAGE).toBe("No free slots on this day.");
  });
});
