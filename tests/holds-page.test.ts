import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Сторінка /holds з підміненим клієнтом Supabase: терапевт отримує відмову без запиту утримань (AC-HOLD-44).
// Що показує список — tests/holds-list.test.ts (holdsList); RLS утримань — tests/db/access.test.ts.
const supabaseMock = vi.hoisted(() => ({
  getClaims: vi.fn(),
  profile: vi.fn(),
  holds: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    from: (table: string) => {
      if (table === "holds") supabaseMock.holds();
      // getCurrentUser: profiles.select(…).eq("id", …).maybeSingle()
      return { select: () => ({ eq: () => ({ maybeSingle: supabaseMock.profile }) }) };
    },
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { default: HoldsPage } = await import("@/app/(app)/holds/page");
const { AccessDenied } = await import("@/components/access-denied");

function find(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  if (node.type === type) return node;
  for (const value of Object.values(node.props)) {
    const found = Array.isArray(value)
      ? value.map((child) => find(child as ReactNode, type)).find(Boolean)
      : find(value as ReactNode, type);
    if (found) return found;
  }
  return undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/holds", () => {
  it("AC-HOLD-44: терапевт на сторінці утримань — «Only schedulers and admins can view this page.», утримань не читаємо", async () => {
    supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: "t1", email: "therapist1@example.test" } } });
    supabaseMock.profile.mockResolvedValue({
      data: { email: "therapist1@example.test", full_name: null, role: "therapist" },
      error: null,
    });

    const page = await HoldsPage();

    expect(find(page, AccessDenied)?.props.message).toBe("Only schedulers and admins can view this page.");
    expect(supabaseMock.holds).not.toHaveBeenCalled();
  });
});
