#!/usr/bin/env node
// Архітектурне правило «межа доступу» (docs/decisions/0001-auth-boundary.md): доступ до даних перевіряють і база,
// і сервер застосунку, а обхід RLS — лише в схемі private.
// База (supabase/migrations/*.sql):
//   1) definer-in-private — функція `security definer` лише в схемі private (у public — обгортка security invoker);
//   2) definer-search-path — у такої функції `set search_path = ''`;
//   3) table-rls — кожна `create table public.<t>` має `alter table public.<t> enable row level security`;
//   4) table-revoke — і `revoke all on [table] public.<t> from anon, authenticated` (далі — лише явні grant).
// Застосунок (src/):
//   5) no-get-session — жодного виклику getSession(): авторизація лише через getClaims();
//   6) no-middleware — немає src/middleware.ts (сесію оновлює src/proxy.ts);
//   7) page-access — кожна сторінка src/app/(app)/**/page.tsx викликає getPageAccess( до першого createClient( чи
//      load…( — відмова без жодного запиту даних;
//   8) action-auth — у файлі "use server" кожна експортована функція, що звертається до бази (.from( чи .rpc( ),
//      спершу викликає getCurrentUser( або getClaims(.
// Коментарі (-- у SQL, // і /* */ у TS) не перевіряються.
// Використання: node scripts/check-auth-boundary.mjs [--root <dir>] [--json]
// Код виходу: 0 — порушень немає, 1 — є порушення, 2 — немає чого перевіряти (ні src/, ні supabase/migrations/).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();
const asJson = args.includes("--json");

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const SRC = join(root, "src");
const MIGRATIONS = join(root, "supabase", "migrations");
if (!isDir(SRC) && !isDir(MIGRATIONS)) {
  console.error(`check-auth-boundary: у ${root} немає ні src/, ні supabase/migrations/ — вкажіть --root <корінь проєкту>.`);
  process.exit(2);
}

function walk(dir, ext) {
  if (!isDir(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === ".next" ? [] : walk(full, ext);
    return ext.test(entry.name) ? [full] : [];
  });
}

// Коментарі замінюємо пробілами, зберігаючи переноси рядків: номери рядків лишаються правильними.
const blank = (text) => text.replace(/[^\n]/g, " ");
const stripSql = (sql) => sql.replace(/--[^\n]*/g, blank);
const stripTs = (code) => code.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, p) => p + blank(m.slice(p.length)));
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const rel = (file) => relative(root, file).split(sep).join("/");

const violations = [];
const report = (file, text, index, rule, message) =>
  violations.push({ file: rel(file), line: lineOf(text, index), rule, message });

// ── База ────────────────────────────────────────────────────────────────────
const migrationFiles = walk(MIGRATIONS, /\.sql$/).sort();
const allSql = migrationFiles.map((file) => ({ file, sql: stripSql(readFileSync(file, "utf8")) }));

for (const { file, sql } of allSql) {
  // Заголовок функції — від create до початку тіла (as $$ / as $body$).
  const fn = /create\s+(?:or\s+replace\s+)?function\s+([\w."]+)\s*\(([\s\S]*?)\bas\s+\$\w*\$/gi;
  for (const match of sql.matchAll(fn)) {
    const [, name, header] = match;
    if (!/\bsecurity\s+definer\b/i.test(header)) continue;
    if (!/^"?private"?\./i.test(name)) {
      report(file, sql, match.index, "definer-in-private", `${name}: security definer лише в схемі private; у public — обгортка security invoker`);
    }
    if (!/\bset\s+search_path\s*(?:=|to)\s*''/i.test(header)) {
      report(file, sql, match.index, "definer-search-path", `${name}: у security definer потрібен set search_path = ''`);
    }
  }
}

const joined = allSql.map(({ sql }) => sql).join("\n");
for (const { file, sql } of allSql) {
  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.|"public"\.)"?(\w+)"?/gi)) {
    const table = match[1];
    const t = `(?:public\\.|"public"\\.)"?${table}"?`;
    if (!new RegExp(`alter\\s+table\\s+(?:only\\s+)?${t}\\s+enable\\s+row\\s+level\\s+security`, "i").test(joined)) {
      report(file, sql, match.index, "table-rls", `public.${table}: немає enable row level security`);
    }
    if (!new RegExp(`revoke\\s+all\\s+on\\s+(?:table\\s+)?${t}\\s+from\\s+anon\\s*,\\s*authenticated`, "i").test(joined)) {
      report(file, sql, match.index, "table-revoke", `public.${table}: немає revoke all … from anon, authenticated`);
    }
  }
}

// ── Застосунок ──────────────────────────────────────────────────────────────
const srcFiles = walk(SRC, /\.(tsx?|jsx?|mjs)$/);
const appDir = join(SRC, "app", "(app)") + sep;

for (const name of ["middleware.ts", "middleware.js"]) {
  if (existsSync(join(SRC, name))) {
    violations.push({ file: `src/${name}`, line: 1, rule: "no-middleware", message: "middleware заборонено: сесію оновлює src/proxy.ts" });
  }
}

for (const file of srcFiles) {
  const code = stripTs(readFileSync(file, "utf8"));

  for (const match of code.matchAll(/\bgetSession\s*\(/g)) {
    report(file, code, match.index, "no-get-session", "getSession() не перевіряє JWT — авторизація лише через getClaims()");
  }

  if (file.startsWith(appDir) && /[\\/]page\.tsx$/.test(file)) {
    const access = code.search(/\bgetPageAccess\s*\(/);
    const data = code.search(/\bcreateClient\s*\(|\bload[A-Z]\w*\s*\(/);
    if (access < 0) {
      report(file, code, 0, "page-access", "сторінка (app) не викликає getPageAccess()");
    } else if (data >= 0 && data < access) {
      report(file, code, data, "page-access", "запит даних до getPageAccess() — спершу перевірка доступу");
    }
  }

  if (/^\s*["']use server["']/.test(code)) {
    const exports = [...code.matchAll(/export\s+async\s+function\s+(\w+)/g)];
    exports.forEach((match, i) => {
      const end = i + 1 < exports.length ? exports[i + 1].index : code.length;
      const body = code.slice(match.index, end);
      const db = body.search(/\.(?:from|rpc)\s*\(/);
      if (db < 0) return;
      const auth = body.search(/\bgetCurrentUser\s*\(|\bgetClaims\s*\(/);
      if (auth < 0 || auth > db) {
        report(file, code, match.index + db, "action-auth", `${match[1]}: звернення до бази до getCurrentUser()/getClaims()`);
      }
    });
  }
}

const scanned = [isDir(MIGRATIONS) ? `supabase/migrations (${migrationFiles.length})` : null, isDir(SRC) ? `src (${srcFiles.length})` : null]
  .filter(Boolean)
  .join(", ");

if (asJson) {
  console.log(JSON.stringify({ scanned, violations }, null, 2));
} else {
  for (const v of violations) console.log(`${v.file}:${v.line}: [${v.rule}] ${v.message}`);
  console.log(
    violations.length
      ? `check-auth-boundary: FAIL — ${violations.length} порушень (перевірено: ${scanned}). Рішення — docs/decisions/0001-auth-boundary.md.`
      : `check-auth-boundary: OK — порушень немає (перевірено: ${scanned}).`,
  );
}
process.exit(violations.length ? 1 : 0);
