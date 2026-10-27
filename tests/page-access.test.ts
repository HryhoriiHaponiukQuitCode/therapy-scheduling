// Доступ до сторінок (impl-client-cards, задача 1): pageAccess — перша перевірка кожної сторінки до запитів даних.
// Дані охороняє ще й RLS — тести бази в tests/db/access.test.ts.
import { describe, expect, it } from "vitest";
import { NO_ROLE_MESSAGE, pageAccess, STAFF_ONLY_PAGE_MESSAGE, STAFF_ROLES } from "@/lib/roles";

const user = (role: "admin" | "scheduler" | "therapist" | null) => ({ id: "u1", email: "u1@example.test", role });

describe("pageAccess", () => {
  it("AC-CARD-07: без входу — на сторінку входу, без даних", () => {
    expect(pageAccess(null, STAFF_ROLES, STAFF_ONLY_PAGE_MESSAGE)).toEqual({ kind: "anon" });
  });

  it("AC-CARD-11: без ролі — лише повідомлення про відсутність доступу на будь-якій сторінці", () => {
    for (const allowed of [STAFF_ROLES, ["therapist"] as const, ["admin", "scheduler", "therapist"] as const]) {
      expect(pageAccess(user(null), allowed, STAFF_ONLY_PAGE_MESSAGE)).toEqual({ kind: "no-role" });
    }
    expect(NO_ROLE_MESSAGE).toBe("Your account has no access yet. Contact an administrator.");
  });

  it("AC-HOLD-44: терапевт на сторінках слотів і утримань планувальника — лише відмова", () => {
    expect(pageAccess(user("therapist"), STAFF_ROLES, STAFF_ONLY_PAGE_MESSAGE)).toEqual({
      kind: "forbidden",
      message: "Only schedulers and admins can view this page.",
    });
  });

  it("AC-HOLD-44: планувальник і адміністратор сторінку слотів бачать", () => {
    expect(pageAccess(user("scheduler"), STAFF_ROLES, STAFF_ONLY_PAGE_MESSAGE).kind).toBe("ok");
    expect(pageAccess(user("admin"), STAFF_ROLES, STAFF_ONLY_PAGE_MESSAGE).kind).toBe("ok");
  });
});
