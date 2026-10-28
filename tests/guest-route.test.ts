import { describe, expect, it } from "vitest";
import { guestRoute } from "@/lib/guest-route";

describe("guestRoute: куди веде запит без входу", () => {
  it("«/» показує лендінг /welcome за тією самою адресою (rewrite)", () => {
    expect(guestRoute("/")).toEqual({ kind: "rewrite", pathname: "/welcome" });
  });

  it("лендінг, вхід і auth-колбек відкриваються без входу", () => {
    for (const path of ["/welcome", "/login", "/auth/callback"]) {
      expect(guestRoute(path)).toEqual({ kind: "next" });
    }
  });

  it("AC-CARD-07: сторінки застосунку за прямим посиланням ведуть на /login, а не на лендінг", () => {
    for (const path of ["/clients", "/clients/new", "/holds", "/slots", "/my-schedule"]) {
      expect(guestRoute(path)).toEqual({ kind: "redirect", pathname: "/login" });
    }
  });

  it("адреси, лише схожі на публічні, теж ведуть на /login", () => {
    for (const path of ["/welcome-private", "/login-x", "/authx"]) {
      expect(guestRoute(path)).toEqual({ kind: "redirect", pathname: "/login" });
    }
  });
});
