import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { repoRoot, runScript } from "./run-script";

// Самоперевірка scripts/check-auth-boundary.mjs: мінімальний проєкт без порушень і по одному зламаному випадку на
// кожне правило — кожен має впасти саме зі своїм правилом. Плюс сам репозиторій — без порушень.

const OK: Record<string, string> = {
  "supabase/migrations/20260101000000_base.sql": `
create table public.items (id uuid primary key);
alter table public.items enable row level security;
revoke all on table public.items from anon, authenticated;

-- security definer у public тут лише в коментарі
create or replace function private.do_it(p uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$ begin perform 1; end; $$;

create or replace function public.do_it(p uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.do_it(p); $$;
`,
  "src/app/(app)/items/page.tsx": `import { createClient } from "@/lib/supabase/server";
import { getPageAccess } from "@/lib/request-user";
import { loadItems } from "./data";

// getSession() для авторизації не використовуємо.
export default async function ItemsPage() {
  const access = await getPageAccess(["admin"]);
  if (access.kind !== "ok") return null;
  const supabase = await createClient();
  return loadItems(supabase);
}
`,
  "src/app/(app)/items/actions.ts": `"use server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/roles";

export async function doIt(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return;
  await supabase.rpc("do_it", { p: String(formData.get("id")) });
}

export async function noDatabase() {
  return "ok";
}
`,
  "src/proxy.ts": `export async function proxy() { /* getClaims() */ }\n`,
};

const CASES: { rule: string; change: Record<string, string | null> }[] = [
  {
    rule: "definer-in-private",
    change: {
      "supabase/migrations/20260102000000_bad.sql": `create function public.leak() returns void language sql security definer set search_path = '' as $$ select 1; $$;`,
    },
  },
  {
    rule: "definer-search-path",
    change: {
      "supabase/migrations/20260102000000_bad.sql": `create function private.leak() returns void language sql security definer as $$ select 1; $$;`,
    },
  },
  {
    rule: "table-rls",
    change: {
      "supabase/migrations/20260102000000_bad.sql": `create table public.open (id int);\nrevoke all on table public.open from anon, authenticated;`,
    },
  },
  {
    rule: "table-revoke",
    change: {
      "supabase/migrations/20260102000000_bad.sql": `create table public.open (id int);\nalter table public.open enable row level security;`,
    },
  },
  {
    rule: "no-get-session",
    change: { "src/lib/session.ts": `export const s = (c: any) => c.auth.getSession();\n` },
  },
  { rule: "no-middleware", change: { "src/middleware.ts": `export function middleware() {}\n` } },
  {
    rule: "page-access",
    change: {
      "src/app/(app)/open/page.tsx": `import { loadItems } from "./data";\nexport default async function Open() {\n  return loadItems();\n}\n`,
    },
  },
  {
    rule: "page-access",
    change: {
      "src/app/(app)/late/page.tsx": `export default async function Late() {
  const supabase = await createClient();
  const access = await getPageAccess(["admin"]);
  return [supabase, access];
}
`,
    },
  },
  {
    rule: "action-auth",
    change: {
      "src/app/(app)/items/actions.ts": `"use server";
export async function doIt() {
  const supabase = await createClient();
  await supabase.from("items").insert({});
  await getCurrentUser(supabase);
}
`,
    },
  },
];

const temps: string[] = [];

function project(change: Record<string, string | null> = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "auth-boundary-"));
  temps.push(dir);
  for (const [file, text] of Object.entries({ ...OK, ...change })) {
    if (text === null) continue;
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  }
  return dir;
}

const rulesOf = (out: string) => [...new Set([...out.matchAll(/\[([\w-]+)\]/g)].map((m) => m[1]))];

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe("check-auth-boundary", () => {
  it("проєкт без порушень — OK, код 0", () => {
    const { code, out } = runScript("check-auth-boundary.mjs", project());
    expect(out).toContain("check-auth-boundary: OK");
    expect(code).toBe(0);
  });

  it("сам репозиторій — без порушень", () => {
    const { code, out } = runScript("check-auth-boundary.mjs", repoRoot);
    expect(out).toContain("check-auth-boundary: OK");
    expect(code).toBe(0);
  });

  it.each(CASES.map((c, i) => [`${i + 1}. ${c.rule}`, c] as const))("%s — FAIL лише з цим правилом", (_, c) => {
    const { code, out } = runScript("check-auth-boundary.mjs", project(c.change));
    expect(code).toBe(1);
    expect(rulesOf(out)).toEqual([c.rule]);
    expect(out).toMatch(/^[^\s:]+[^:]*:\d+: \[/m);
  });

  it("немає ні src/, ні supabase/migrations/ — код 2", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "auth-boundary-empty-"));
    temps.push(dir);
    expect(runScript("check-auth-boundary.mjs", dir).code).toBe(2);
  });
});
