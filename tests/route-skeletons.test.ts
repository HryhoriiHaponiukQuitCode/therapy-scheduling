import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Запобіжник від розходження скелетонів зі сторінками (DESIGN.md, розділ 6, «Завантаження розділу»): кожна сторінка
// застосунку має поруч власний loading.tsx (інакше вкладений маршрут успадкує чужий скелетон батька) і shell.tsx —
// каркас (заголовок сторінки, панелі, їхні назви й дії), який рендерять і page.tsx, і loading.tsx. Скелетон не
// повторює розмітку сторінки вручну: він лише передає в той самий каркас скелетони замість даних.
const APP_DIR = join(process.cwd(), "src/app/(app)");

function pageDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pageDirs(join(dir, entry.name))
      : entry.name === "page.tsx"
        ? [dir]
        : [],
  );
}

// Імена, які файл імпортує з "./shell".
function shellImports(source: string): string[] {
  const match = source.match(/import\s*\{([^}]*)\}\s*from\s*"\.\/shell"/);
  return match ? match[1].split(",").map((name) => name.trim()).filter(Boolean) : [];
}

const read = (dir: string, file: string) => readFileSync(join(dir, file), "utf8");
const routes = pageDirs(APP_DIR).map((dir) => ({ dir, name: `/${relative(APP_DIR, dirname(join(dir, "page.tsx")))}` }));

describe("route skeletons share the page shell", () => {
  it("finds the app pages", () => {
    expect(routes.map((route) => route.name).sort()).toEqual(
      expect.arrayContaining(["/", "/clients", "/clients/[id]", "/clients/new", "/holds", "/my-schedule", "/slots"]),
    );
  });

  it.each(routes)("$name has its own loading.tsx and shell.tsx", ({ dir }) => {
    expect(existsSync(join(dir, "loading.tsx"))).toBe(true);
    expect(existsSync(join(dir, "shell.tsx"))).toBe(true);
  });

  it.each(routes)("$name: page.tsx and loading.tsx render the same shell component", ({ dir }) => {
    const page = read(dir, "page.tsx");
    const loading = read(dir, "loading.tsx");
    const pageShells = shellImports(page).filter((name) => name.endsWith("Shell"));
    const loadingShells = shellImports(loading).filter((name) => name.endsWith("Shell"));
    expect(pageShells.length).toBeGreaterThan(0);
    expect(loadingShells).toEqual(expect.arrayContaining(pageShells));
    // Імпорту мало: обидва файли мають рендерити каркас у JSX.
    for (const name of pageShells) {
      const usage = new RegExp(`<${name}[\\s>/]`);
      expect(page).toMatch(usage);
      expect(loading).toMatch(usage);
    }
  });

  it.each(routes)("$name: loading.tsx announces loading and does not rebuild the page layout by hand", ({ dir }) => {
    const loading = read(dir, "loading.tsx");
    expect(loading).toContain("<LoadingStatus />");
    expect(loading).not.toMatch(/from "@\/components\/(page-header|ui\/panel)"/);
  });
});
