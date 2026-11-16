import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { afterAll, describe, expect, it } from "vitest";
import { proposeIntake } from "@/lib/ai/draft";
import { GOLDEN_TODAY, passRate, scoreGolden, type GoldenFile } from "@/lib/ai/golden";
import { PRODUCT_MODEL, makeProductModel } from "@/lib/ai/models";
import { INTAKE_PROMPT_VERSION } from "@/lib/ai/prompts/intake";
import { IntakeExtractionSchema } from "@/lib/ai/schema";
import { intakeOutcome } from "@/lib/intake";
import goldenJson from "../tests/fixtures/golden/cases.json";

// `npm run eval` — ЖИВИЙ прогін 10 golden cases PM на моделі продукту. Ніколи не в `npm test` і не в CI.
// Ключ — ANTHROPIC_API_KEY у .env.local (vitest.eval.config.mts читає його лише для цього прогону; значення не друкуємо).
// Без ключа всі кейси пропускаються. 429 зупиняє прогін: цей і решта кейсів — NOT RUN з причиною у звіті.
//   RECORD=1 — успішні відповіді моделі дописати в tests/fixtures/golden/recorded.json (офлайн-реплей у CI).
//   RUNS=2   — кілька прогонів поспіль.

const { cases } = goldenJson as GoldenFile;
const key = process.env.ANTHROPIC_API_KEY?.trim();
const RECORD = process.env.RECORD === "1";
const RUNS = Math.max(1, Number(process.env.RUNS ?? 1) || 1);
const RECORDED_PATH = "tests/fixtures/golden/recorded.json";
const REPORT_DIR = "evals/reports";
const GAP_MS = 1_500;

type Recording = { modelId: string; recordedAt: string; promptVersion: string; text: string };
type Row = { run: number; id: string; ac: string; modelId: string; pass: boolean; notRun?: boolean; why: string };
const rows: Row[] = [];
const fresh: Record<string, Recording> = {};
let stoppedAt: string | undefined;

describe.skipIf(!key)(`golden cases, живий прогін (${PRODUCT_MODEL})`, () => {
  for (let run = 1; run <= RUNS; run++) {
    for (const c of cases) {
      it(`прогін ${run}: golden ${c.id}`, async (ctx) => {
        if (stoppedAt) {
          rows.push({ run, id: c.id, ac: c.ac, modelId: "—", pass: false, notRun: true, why: `NOT RUN: зупинено після 429 (${stoppedAt})` });
          return ctx.skip();
        }
        await sleep(GAP_MS);
        const result = await proposeIntake(c.input, makeProductModel(key!), { maxRetries: 0, timeoutMs: 60_000 });
        if (!result.ok && result.reason === "rate_limited") {
          stoppedAt = `${c.id}, прогін ${run}`;
          rows.push({ run, id: c.id, ac: c.ac, modelId: "—", pass: false, notRun: true, why: `NOT RUN: 429 — ${result.message}` });
          return ctx.skip();
        }
        const outcome = intakeOutcome(result, GOLDEN_TODAY, c.input, 0);
        const diffs = result.ok ? scoreGolden(c, outcome) : [`${result.reason}: ${result.message}`];
        const pass = diffs.length === 0;
        rows.push({ run, id: c.id, ac: c.ac, modelId: result.ok ? result.modelId : "—", pass, why: diffs.join("; ") });
        // Записуємо лише успішні відповіді: офлайн-реплей у CI має бути зеленим на справжніх відповідях.
        if (RECORD && pass && result.ok) {
          fresh[c.id] = {
            modelId: result.modelId,
            recordedAt: new Date().toISOString(),
            promptVersion: INTAKE_PROMPT_VERSION,
            text: JSON.stringify(IntakeExtractionSchema.parse(result.extraction)),
          };
        }
        expect(diffs).toEqual([]);
      });
    }
  }

  afterAll(() => {
    console.table(rows);
    writeReport();
    if (RECORD && Object.keys(fresh).length > 0) {
      let old: Record<string, Recording> = {};
      try {
        old = JSON.parse(readFileSync(RECORDED_PATH, "utf8")) as Record<string, Recording>;
      } catch {
        old = {};
      }
      writeFileSync(RECORDED_PATH, JSON.stringify({ ...old, ...fresh }, null, 2) + "\n");
    }
  });
});

function gitSha(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    const dirty = execSync("git status --porcelain -- src evals tests/fixtures/golden/cases.json", { encoding: "utf8" }).trim();
    return dirty ? `${sha} (+ незакомічені зміни в src/evals)` : sha;
  } catch {
    return "невідомо";
  }
}

function writeReport() {
  if (rows.length === 0) return;
  const ran = rows.filter((r) => !r.notRun);
  const notRun = rows.filter((r) => r.notRun);
  const total = passRate(ran);
  const byModel = new Map<string, Row[]>();
  for (const r of ran) byModel.set(r.modelId, [...(byModel.get(r.modelId) ?? []), r]);
  const gc = (id: string) => ran.find((r) => r.id === id && r.run === 1)?.pass;
  const now = new Date();
  const lines = [
    `# Живий прогін golden cases — ${now.toISOString()}`,
    "",
    `- Код: \`${gitSha()}\`; промпт: \`${INTAKE_PROMPT_VERSION}\`; модель продукту: \`${PRODUCT_MODEL}\`; суддя: немає (усі поля й повідомлення порівнюються точно)`,
    `- «Сьогодні» для правил коду: ${GOLDEN_TODAY} (як у golden cases PM); прогонів: ${RUNS}; кейсів у прогоні: ${cases.length}`,
    `- **Частка успіху: ${total.passed}/${total.total} (${Math.round(total.rate * 100)}%)** — з кейсів, що отримали відповідь`,
    `- Поріг PM: 8/10, обов'язково GC-09 (${gc("GC-09") ? "✅" : "❌"}) і GC-10 (${gc("GC-10") ? "✅" : "❌"})`,
    `- Не запущено (NOT RUN): ${notRun.length}${stoppedAt ? ` — ліміт 429, зупинено на: ${stoppedAt}` : ""}`,
    "",
    "| Модель, що відповіла | Пройшло | Усього |",
    "|---|---|---|",
    ...[...byModel].map(([m, rs]) => `| \`${m}\` | ${passRate(rs).passed} | ${rs.length} |`),
    "",
    "| Прогін | Кейс | AC | Модель | Результат | Розбіжності / помилка |",
    "|---|---|---|---|---|---|",
    ...rows.map(
      (r) => `| ${r.run} | ${r.id} | ${r.ac} | \`${r.modelId}\` | ${r.notRun ? "NOT RUN" : r.pass ? "✅" : "❌"} | ${r.why.replaceAll("|", "/")} |`,
    ),
    "",
  ];
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = `${REPORT_DIR}/${now.toISOString().replace(/[:.]/g, "-")}.md`;
  writeFileSync(file, lines.join("\n"));
  console.log(`Звіт: ${file}`);
}
