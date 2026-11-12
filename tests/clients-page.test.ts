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
const { ClientCardShell } = await import("@/app/(app)/clients/[id]/shell");
const { ActionMessage } = await import("@/components/action-message");
const { InsuranceStatusForm } = await import("@/app/(app)/clients/[id]/insurance-status-form");

// Тексти «Тоді» з AC-CARD-16 (requirements/19-…): планувальник — «не існує», терапевт — «немає доступу».
const AC_CARD_16_MESSAGES = [
  ["scheduler", "This client card doesn't exist."],
  ["therapist", "You don't have access to this client."],
] as const;

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

// Перший елемент із data-testid у дереві, яке повернула сторінка.
function findTestId(node: ReactNode, testId: string): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findTestId(child, testId);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  if (node.props["data-testid"] === testId) return node;
  for (const value of Object.values(node.props)) {
    const found = findTestId(value as ReactNode, testId);
    if (found) return found;
  }
  return undefined;
}

// Усі текстові вузли дерева (рядки в children елементів).
function texts(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return texts(node.props.children);
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

  // Схожі на посилання картки, але не вони: зайвий символ на початку чи в кінці, укорочена група.
  for (const [label, id] of [
    ["зайвий символ перед UUID", "xc5555555-5555-4555-8555-555555555555"],
    ["зайвий символ після UUID", "c5555555-5555-4555-8555-555555555555x"],
    ["укорочена третя група", "c5555555-5555-4-8555-555555555555"],
  ]) {
    it(`AC-CARD-16: ${label} — відмова за роллю, без даних клієнтів і без запиту до бази`, async () => {
      for (const [role, message] of AC_CARD_16_MESSAGES) {
        signedIn(role);
        const page = await ClientCardPage({ params: Promise.resolve({ id }) } as never);
        expect(find(page, AccessDenied)?.props.message).toBe(message);
        expect(find(page, ClientCardShell)).toBeUndefined();
        expect(findTestId(page, "client-card")).toBeUndefined();
      }
      expect(supabaseMock.clients).not.toHaveBeenCalled();
    });
  }
});

describe("/clients/[id] — посилання на картку", () => {
  const CARD_ID = "c5555555-5555-4555-8555-555555555555";

  it("AC-CARD-16: правильне посилання, але картки немає — повідомлення за роллю і жодних даних клієнтів", async () => {
    supabaseMock.clients.mockResolvedValue({ data: null, error: null });
    for (const [role, message] of AC_CARD_16_MESSAGES) {
      signedIn(role);
      const page = await ClientCardPage({ params: Promise.resolve({ id: CARD_ID }) } as never);
      expect(find(page, AccessDenied)?.props.message).toBe(message);
      expect(find(page, ClientCardShell)).toBeUndefined();
      expect(findTestId(page, "client-card")).toBeUndefined();
    }
    expect(supabaseMock.clients).toHaveBeenCalledTimes(2);
  });

  it("AC-CARD-10: планувальник і адміністратор відкривають наявну картку дитини — бачать картку з даними опікуна", async () => {
    supabaseMock.clients.mockResolvedValue({
      data: {
        full_name: "Client Seven",
        client_type: "child",
        birth_date: "2018-04-01",
        session_language: "English",
        email: null,
        guardian_name: "Guardian Seven",
        guardian_email: "guardian7@example.test",
        insurance_status: "not_set",
      },
      error: null,
    });
    for (const role of ["scheduler", "admin"]) {
      signedIn(role);
      const page = await ClientCardPage({ params: Promise.resolve({ id: CARD_ID }) } as never);
      expect(find(page, AccessDenied)).toBeUndefined();
      expect(find(page, ClientCardShell)?.props.name).toBe("Client Seven");
      const card = findTestId(page, "client-card");
      expect(card).toBeDefined();
      expect(texts(card)).toEqual(expect.arrayContaining(["Guardian Seven", "guardian7@example.test"]));
    }
    expect(supabaseMock.clients).toHaveBeenCalledTimes(2);
  });

  const adultCard = (insurance_status: string) => ({
    data: {
      full_name: "Client One",
      client_type: "adult",
      birth_date: "1990-05-14",
      session_language: "English",
      email: "client1@example.test",
      guardian_name: null,
      guardian_email: null,
      insurance_status,
    },
    error: null,
  });

  it("AC-INS-01: картка без позначки показує рядок «Insurance: Not set» кожній ролі, що бачить картку", async () => {
    supabaseMock.clients.mockResolvedValue(adultCard("not_set"));
    for (const role of ["scheduler", "admin", "therapist"]) {
      signedIn(role);
      const page = await ClientCardPage({ params: Promise.resolve({ id: CARD_ID }) } as never);
      expect(texts(findTestId(page, "insurance-status")).join("")).toBe("Insurance: Not set");
    }
  });

  it("AC-INS-04: терапевт бачить «Insurance: Not accepted», а змінити статус йому не запропоновано", async () => {
    supabaseMock.clients.mockResolvedValue(adultCard("not_accepted"));
    signedIn("therapist");
    const page = await ClientCardPage({ params: Promise.resolve({ id: CARD_ID }) } as never);
    expect(texts(findTestId(page, "insurance-status")).join("")).toBe("Insurance: Not accepted");
    expect(find(page, InsuranceStatusForm)).toBeUndefined();
  });

  it("AC-INS-02: планувальнику й адміністратору картка пропонує змінити статус", async () => {
    supabaseMock.clients.mockResolvedValue(adultCard("verified"));
    for (const role of ["scheduler", "admin"]) {
      signedIn(role);
      const page = await ClientCardPage({ params: Promise.resolve({ id: CARD_ID }) } as never);
      expect(find(page, InsuranceStatusForm)?.props).toEqual({ clientId: CARD_ID, status: "verified" });
    }
  });

  it("невідоме значення статусу — помилка завантаження, а не вигаданий «Not set»", async () => {
    supabaseMock.clients.mockResolvedValue(adultCard("pending"));
    signedIn("scheduler");
    const page = await ClientCardPage({ params: Promise.resolve({ id: CARD_ID }) } as never);
    expect(find(page, ActionMessage)?.props.state).toEqual({
      status: "error",
      message: "Could not load the client card. Try again later.",
    });
    expect(find(page, ClientCardShell)).toBeUndefined();
    expect(findTestId(page, "insurance-status")).toBeUndefined();
  });
});
