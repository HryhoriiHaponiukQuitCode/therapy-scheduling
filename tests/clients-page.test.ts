import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Сторінки /clients і /clients/[id] з підміненим клієнтом Supabase: перевіряємо, що сторінка вибирає текст PM за
// роллю того, хто дивиться. Самі рядки (хто чию картку бачить) перевіряє RLS у tests/db/client-access.test.ts.
const supabaseMock = vi.hoisted(() => ({
  getClaims: vi.fn(),
  profile: vi.fn(),
  clients: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: supabaseMock.getClaims },
    from: (table: string) =>
      table === "profiles"
        ? // getCurrentUser: profiles.select(…).eq("id", …).maybeSingle()
          { select: () => ({ eq: () => ({ maybeSingle: supabaseMock.profile }) }) }
        : // /clients: select(…).order(…); /clients/[id]: select(…).eq(…).maybeSingle()
          {
            select: () => ({
              order: () => supabaseMock.clients(),
              eq: () => ({ maybeSingle: () => supabaseMock.clients() }),
            }),
          },
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { default: ClientsPage } = await import("@/app/(app)/clients/page");
const { default: ClientCardPage } = await import("@/app/(app)/clients/[id]/page");
const { EmptyState } = await import("@/components/empty-state");
const { AccessDenied } = await import("@/components/access-denied");

// Перший елемент потрібного типу в дереві, яке повернула сторінка (компоненти не рендеримо).
function find(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  if (node.type === type) return node;
  for (const value of Object.values(node.props)) {
    const found = find(value as ReactNode, type);
    if (found) return found;
  }
  return undefined;
}

function signedIn(role: string) {
  supabaseMock.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", email: `${role}1@example.test` } } });
  supabaseMock.profile.mockResolvedValue({ data: { email: `${role}1@example.test`, full_name: null, role }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.clients.mockResolvedValue({ data: [], error: null });
});

describe("/clients — порожній список", () => {
  it("AC-CARD-09: терапевт без клієнтів бачить текст PM для терапевта", async () => {
    signedIn("therapist");
    const empty = find(await ClientsPage(), EmptyState);
    expect(empty?.props.children).toBe("No clients yet. Clients appear here when a scheduler holds a slot with you.");
  });

  it("AC-CARD-15: планувальник і адміністратор без карток бачать текст PM для персоналу", async () => {
    for (const role of ["scheduler", "admin"]) {
      signedIn(role);
      const empty = find(await ClientsPage(), EmptyState);
      expect(empty?.props.children).toBe("No clients yet. Create a client card from an intake form.");
    }
  });
});

describe("/clients/[id] — посилання не на картку", () => {
  it("AC-CARD-16: id не UUID — відмова за роллю без запиту до бази", async () => {
    for (const [role, message] of [
      ["therapist", "You don't have access to this client."],
      ["scheduler", "This client card doesn't exist."],
    ]) {
      signedIn(role);
      const page = await ClientCardPage({ params: Promise.resolve({ id: "abc" }) } as never);
      expect(find(page, AccessDenied)?.props.message).toBe(message);
    }
    expect(supabaseMock.clients).not.toHaveBeenCalled();
  });
});
