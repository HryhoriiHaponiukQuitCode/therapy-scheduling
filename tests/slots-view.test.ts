import { describe, expect, it, vi } from "vitest";
import { weekdayName } from "@/lib/slots";

// data.ts тягне серверний клієнт Supabase лише як тип; підміна — щоб імпорт не читав cookies.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { DEFAULT_THERAPIST_COLUMNS, selectTherapists } = await import("@/app/(app)/slots/data");

const therapists = [
  { id: "t1", name: "Therapist One", email: "therapist1@example.test" },
  { id: "t2", name: "Therapist Two", email: "therapist2@example.test" },
  { id: "t3", name: "Therapist Three", email: "therapist3@example.test" },
];

// Колонки /slots: вибрані терапевти з повторюваного GET-параметра therapist.
describe("selectTherapists", () => {
  it("keeps the chosen therapists in list order", () => {
    expect(selectTherapists(therapists, ["t3", "t1"]).map((t) => t.id)).toEqual(["t1", "t3"]);
  });

  it("shows the first therapists when nothing known is chosen", () => {
    expect(selectTherapists(therapists, [])).toEqual(therapists);
    expect(selectTherapists(therapists, ["unknown"])).toEqual(therapists);
  });

  it("caps the default to DEFAULT_THERAPIST_COLUMNS columns", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, email: `t${i}@example.test` }));
    expect(selectTherapists(many, []).map((t) => t.id)).toEqual(["t0", "t1", "t2", "t3"]);
    expect(DEFAULT_THERAPIST_COLUMNS).toBe(4);
  });
});

// Підзаголовок сітки /slots: день тижня календарної дати, без зсуву через часовий пояс.
describe("weekdayName", () => {
  it("names the weekday of a calendar date", () => {
    expect(weekdayName("2026-11-03")).toBe("Tuesday");
    expect(weekdayName("2026-11-08")).toBe("Sunday");
  });
});
