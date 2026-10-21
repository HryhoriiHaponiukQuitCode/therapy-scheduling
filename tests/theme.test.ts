import { describe, expect, it } from "vitest";
import { parseTheme } from "@/lib/theme";

// Тема з cookie: темна — лише явне «dark», усе інше (немає cookie, стара чи зіпсована) — світла за замовчуванням.
describe("parseTheme", () => {
  it("returns dark only for the dark cookie value", () => {
    expect(parseTheme("dark")).toBe("dark");
  });

  it("falls back to light for a missing or unknown value", () => {
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("blue")).toBe("light");
  });
});
