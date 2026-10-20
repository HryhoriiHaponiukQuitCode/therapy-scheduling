import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Спільний каркас src/app/(app)/layout.tsx і getRequestUser: користувач для AppShell — з getClaims і власного
// профілю; без сесії layout віддає сторінку без каркаса (редирект на /login робить сторінка).
const supabaseMock = vi.hoisted(() => ({
  getClaims: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    // getCurrentUser: profiles.select(…).eq("id", …).maybeSingle()
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: supabaseMock.profile }) }) }),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { getRequestUser } = await import("@/lib/request-user");
const { default: AppLayout } = await import("@/app/(app)/layout");
const { AppShell } = await import("@/components/app-shell");

const page = "page content";

function signedIn(role: string) {
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", email: "scheduler1@example.test" } } });
  supabaseMock.profile.mockResolvedValue({ data: { email: "scheduler1@example.test", full_name: null, role } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRequestUser", () => {
  it("returns the signed-in user with the role from profiles", async () => {
    signedIn("scheduler");
    await expect(getRequestUser()).resolves.toEqual({
      id: "user-1",
      email: "scheduler1@example.test",
      role: "scheduler",
    });
  });

  it("returns null without a session and does not query profiles", async () => {
    supabaseMock.getClaims.mockResolvedValue({ data: { claims: null } });
    await expect(getRequestUser()).resolves.toBeNull();
    expect(supabaseMock.profile).not.toHaveBeenCalled();
  });
});

describe("AppLayout", () => {
  it("wraps the page in AppShell with the signed-in user", async () => {
    signedIn("therapist");
    const element = (await AppLayout({ children: page } as never)) as ReactElement<{
      user: unknown;
      children: unknown;
    }>;
    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(AppShell);
    expect(element.props.user).toEqual({ id: "user-1", email: "scheduler1@example.test", role: "therapist" });
    expect(element.props.children).toBe(page);
  });

  it("renders the page without the shell when there is no session", async () => {
    supabaseMock.getClaims.mockResolvedValue({ data: { claims: null } });
    await expect(AppLayout({ children: page } as never)).resolves.toBe(page);
  });
});
