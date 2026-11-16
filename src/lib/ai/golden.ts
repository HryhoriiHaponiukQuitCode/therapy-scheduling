import type { ClientCardValues } from "@/lib/clients";
import type { IntakeState } from "@/lib/intake";

// Golden case PM (tests/fixtures/golden/cases.json): вхід дослівно → очікувані поля форми й повідомлення.
export type GoldenCase = {
  id: string; // "GC-01"
  ac: string; // AC вимоги PM, який доводить кейс
  input: string;
  expected:
    | { kind: "draft"; values: ClientCardValues; message: string }
    | { kind: "refused"; message: string };
  rule: string;
};

export type GoldenFile = { source: string; threshold: string; cases: GoldenCase[] };

// «Сьогодні» в golden cases PM (дати підібрано так, що очікуване не змінюється з 2026-11-13 до 2026-11-16).
export const GOLDEN_TODAY = "2026-11-13";

// Точне порівняння результату з очікуваним PM: стан, усі сім полів форми й текст повідомлення.
export function scoreGolden(c: GoldenCase, outcome: Exclude<IntakeState, { status: "idle" }>): string[] {
  const diffs: string[] = [];
  if (outcome.message !== c.expected.message) diffs.push(`message: «${outcome.message}» ≠ «${c.expected.message}»`);
  if (c.expected.kind === "refused") {
    if (outcome.status !== "refused") diffs.push(`status: ${outcome.status} ≠ refused`);
    return diffs;
  }
  if (outcome.status !== "draft") return [...diffs, `status: ${outcome.status} ≠ draft`];
  for (const [field, want] of Object.entries(c.expected.values) as [keyof ClientCardValues, string][]) {
    if (outcome.values[field] !== want) diffs.push(`${field}: «${outcome.values[field]}» ≠ «${want}»`);
  }
  return diffs;
}

export function passRate(results: { pass: boolean }[]) {
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, rate: results.length ? passed / results.length : 0 };
}
