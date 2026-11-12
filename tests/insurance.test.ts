import { describe, expect, it } from "vitest";
import {
  canChangeInsurance,
  INSURANCE_FIELD,
  INSURANCE_STATUSES,
  insuranceLine,
  insuranceStatusText,
  isInsuranceStatus,
  parseInsuranceStatus,
} from "@/lib/insurance";

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

// Зміна статусу (impl-insurance-update): значення з форми і хто може змінювати.
describe("parseInsuranceStatus", () => {
  it("AC-INS-02: приймає лише три статуси, які можна позначити: verified, not_accepted, private_pay", () => {
    expect(INSURANCE_FIELD).toBe("insurance_status");
    expect(parseInsuranceStatus("verified")).toBe("verified");
    expect(parseInsuranceStatus("not_accepted")).toBe("not_accepted");
    expect(parseInsuranceStatus("private_pay")).toBe("private_pay");
  });

  it("AC-INS-02: статус не можна повернути в «Not set» — not_set відхилено", () => {
    expect(parseInsuranceStatus("not_set")).toBeNull();
  });

  it("AC-INS-02: відхиляє все інше: інший регістр, тексти PM, порожнє, null, не-рядки, ключі Object.prototype", () => {
    for (const value of [
      "Verified",
      "VERIFIED",
      " verified",
      "verified ",
      "Private pay",
      "Not accepted",
      "",
      "toString",
      "__proto__",
      "constructor",
      "hasOwnProperty",
      null,
      undefined,
      0,
      1,
      true,
      {},
      ["verified"],
      new Blob(["verified"]),
    ]) {
      expect(parseInsuranceStatus(value)).toBeNull();
    }
  });
});

describe("canChangeInsurance", () => {
  it("AC-INS-02: scheduler і admin можуть змінювати статус перевірки страхування", () => {
    expect(canChangeInsurance("scheduler")).toBe(true);
    expect(canChangeInsurance("admin")).toBe(true);
  });

  it("AC-INS-04: therapist cannot change the insurance status — and neither can a user without a role", () => {
    for (const role of ["therapist", null, undefined, "", "Admin", "SCHEDULER", "admin ", "toString"]) {
      expect(canChangeInsurance(role)).toBe(false);
    }
  });
});
