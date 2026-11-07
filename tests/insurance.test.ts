import { describe, expect, it } from "vitest";
import { INSURANCE_STATUSES, insuranceLine, insuranceStatusText, isInsuranceStatus } from "@/lib/insurance";

// Рядок статусу страхування в картці клієнта (openspec/specs/client-insurance/spec.md).
describe("insuranceStatusText", () => {
  it("AC-INS-01: a card without a status shows «Insurance: Not set»", () => {
    expect(insuranceLine("not_set")).toBe("Insurance: Not set");
    expect(insuranceLine("private_pay")).toBe("Insurance: Private pay");
  });

  it("shows the PM text for every status the database allows", () => {
    expect(insuranceStatusText("verified")).toBe("Verified");
    expect(insuranceStatusText("not_accepted")).toBe("Not accepted");
    expect(insuranceStatusText("private_pay")).toBe("Private pay");
  });

  it("returns null for an unknown value instead of pretending it is «Not set»", () => {
    expect(insuranceStatusText("unknown")).toBeNull();
    expect(insuranceStatusText("toString")).toBeNull();
    expect(insuranceStatusText("")).toBeNull();
    expect(insuranceLine("unknown")).toBeNull();
  });
});

describe("isInsuranceStatus", () => {
  it("accepts exactly the four database values", () => {
    expect(Object.keys(INSURANCE_STATUSES)).toEqual(["not_set", "verified", "not_accepted", "private_pay"]);
    for (const value of Object.keys(INSURANCE_STATUSES)) expect(isInsuranceStatus(value)).toBe(true);
    expect(isInsuranceStatus("Verified")).toBe(false);
    expect(isInsuranceStatus("")).toBe(false);
    expect(isInsuranceStatus(null)).toBe(false);
  });
});
