import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Запобіжник для кешу навігації (docs/decisions/0002-router-cache.md): браузер тримає сторінку 30 с, тож server action,
// що змінює дані, має сама скинути кеш кожного шляху з цими даними (revalidatePath). Скидання всіх відвіданих
// сторінок від будь-якого revalidatePath документація Next.js називає тимчасовим — на нього не покладаємось.
const SRC = join(process.cwd(), "src");
const MUTATION = /\.(insert|update|upsert|delete)\(|\.rpc\(/;

// Які сторінки показують дані, що змінює виклик: ці шляхи action має скинути.
const DEPENDENT_PATHS: { call: RegExp; paths: string[] }[] = [
  // Список клієнтів і поле «Client» на /slots.
  { call: /from\("clients"\)\s*\.(insert|update|upsert|delete)\(/, paths: ["/clients", "/slots"] },
  // Статуси слотів, список утримань і статистика головної.
  { call: /\.rpc\("(hold_slot|confirm_hold)"/, paths: ["/slots", "/holds", "/"] },
];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  );
}

// Експортовані функції файлів "use server": ім'я й тіло до наступного export.
const actions = files(SRC)
  .map((path) => ({ path, source: readFileSync(path, "utf8") }))
  .filter(({ source }) => /^"use server";/m.test(source))
  .flatMap(({ path, source }) => {
    const starts = [...source.matchAll(/^export async function (\w+)/gm)];
    return starts.map((match, i) => ({
      name: `${relative(SRC, path)} → ${match[1]}`,
      body: source.slice(match.index, starts[i + 1]?.index ?? source.length),
    }));
  });
const mutating = actions.filter((action) => MUTATION.test(action.body));

describe("server actions скидають кеш навігації", () => {
  it("знаходить дії, що змінюють дані", () => {
    expect(mutating.map((action) => action.name.split(" → ")[1]).sort()).toEqual(
      expect.arrayContaining(["confirmHold", "createClientCard", "holdSlot"]),
    );
  });

  it.each(mutating)("$name викликає revalidatePath для кожного шляху зі зміненими даними", ({ body }) => {
    expect(body).toContain("revalidatePath(");
    for (const { call, paths } of DEPENDENT_PATHS) {
      if (!call.test(body)) continue;
      for (const path of paths) expect(body).toContain(`revalidatePath("${path}")`);
    }
  });
});
