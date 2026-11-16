import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { proposeIntake } from "@/lib/ai/draft";
import { GOLDEN_TODAY, scoreGolden, type GoldenFile } from "@/lib/ai/golden";
import { INTAKE_PROMPT_VERSION } from "@/lib/ai/prompts/intake";
import { ASSISTANT_UNAVAILABLE_MESSAGE, intakeOutcome } from "@/lib/intake";
import goldenJson from "./fixtures/golden/cases.json";
import recordedJson from "./fixtures/golden/recorded.json";

// Офлайн-реплей 10 golden cases PM (вимога #36): без мережі й без ключа, тож працює в CI (`npm test`, job `app`).
// Відповіді моделі — СПРАВЖНІ, записані живим прогоном `RECORD=1 npm run eval` (modelId, дата, версія промпту).
// Перевіряє КОД навколо моделі (межа <client_request>, схема, правила дати / типу / email, «Missing», стани);
// якість моделі міряє живий прогін (evals/reports/).

type Recording = { modelId: string; recordedAt: string; promptVersion: string; text: string };
const { cases } = goldenJson as GoldenFile;
const recorded = recordedJson as Record<string, Recording>;

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

function replay(text: string, modelId = "recorded") {
  return new MockLanguageModelV4({
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

function failing(error: unknown) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw error;
    },
  });
}

// Розбіжності з очікуваним PM ([] — кейс пройшов) і чи дійшов вхід до моделі лише між тегами-межами.
async function replayCase(id: string) {
  const c = cases.find((x) => x.id === id)!;
  const rec = recorded[id];
  if (!rec) return { diffs: [`немає запису для ${id} у recorded.json`], wrapped: false };
  const model = replay(rec.text, rec.modelId);
  const outcome = intakeOutcome(await proposeIntake(c.input, model), GOLDEN_TODAY, c.input, 1);
  return { diffs: scoreGolden(c, outcome), wrapped: JSON.stringify(model.doGenerateCalls[0].prompt).includes("<client_request>") };
}

const ids = (ac: string) => cases.filter((c) => c.ac === ac).map((c) => c.id);

describe("golden cases PM, офлайн-реплей", () => {
  it.each(ids("AC-INTAKE-01"))("AC-INTAKE-01: golden %s", async (id) => {
    expect(await replayCase(id)).toEqual({ diffs: [], wrapped: true });
  });
  it.each(ids("AC-INTAKE-02"))("AC-INTAKE-02: golden %s", async (id) => {
    expect(await replayCase(id)).toEqual({ diffs: [], wrapped: true });
  });
  it.each(ids("AC-INTAKE-04"))("AC-INTAKE-04: golden %s", async (id) => {
    expect(await replayCase(id)).toEqual({ diffs: [], wrapped: true });
  });
  it.each(ids("AC-INTAKE-05"))("AC-INTAKE-05: golden %s", async (id) => {
    expect(await replayCase(id)).toEqual({ diffs: [], wrapped: true });
  });
  it.each(ids("AC-INTAKE-06"))("AC-INTAKE-06: golden %s", async (id) => {
    expect(await replayCase(id)).toEqual({ diffs: [], wrapped: true });
  });
  it.each(ids("AC-INTAKE-07"))("AC-INTAKE-07: golden %s", async (id) => {
    expect(await replayCase(id)).toEqual({ diffs: [], wrapped: true });
  });

  it("усі 10 кейсів PM у наборі, кожен має справжній запис поточної версії промпту", () => {
    expect(cases.map((c) => c.id)).toEqual(Array.from({ length: 10 }, (_, i) => `GC-${String(i + 1).padStart(2, "0")}`));
    expect(cases.map((c) => c.id).filter((id) => !recorded[id])).toEqual([]);
    const stale = Object.entries(recorded).filter(([, r]) => r.promptVersion !== INTAKE_PROMPT_VERSION).map(([id]) => id);
    expect(stale).toEqual([]);
    expect(Object.values(recorded).filter((r) => !/^claude-/.test(r.modelId))).toEqual([]);
  });
});

describe("збої моделі → «помічник недоступний»", () => {
  const c = cases[0];
  const outcomeOf = async (model: MockLanguageModelV4, opts = {}) =>
    intakeOutcome(await proposeIntake(c.input, model, opts), GOLDEN_TODAY, c.input, 1);

  it("AC-INTAKE-08: відповідь не за схемою — недоступний, форма не змінюється", async () => {
    const outcome = await outcomeOf(replay('{"status":"ok","client_name":"Nora Vale","session_language":"French"}'));
    expect(outcome).toEqual({ status: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE, request: c.input, at: 1 });
  });

  it("AC-INTAKE-08: 429 — недоступний, без повторів (одна спроба)", async () => {
    const model = failing(
      new APICallError({ message: "rate_limit_error", url: "https://api.anthropic.com/v1/messages", requestBodyValues: {}, statusCode: 429 }),
    );
    expect(await outcomeOf(model)).toMatchObject({ status: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("AC-INTAKE-08: HTTP 200 з тілом помилки code 429 — недоступний", async () => {
    const model = failing(
      new APICallError({ message: "error", url: "u", requestBodyValues: {}, statusCode: 200, data: { code: 429 } }),
    );
    expect(await outcomeOf(model)).toMatchObject({ status: "unavailable" });
  });

  it("AC-INTAKE-08: постачальник перевантажений (529) — недоступний", async () => {
    const model = failing(new APICallError({ message: "overloaded_error", url: "u", requestBodyValues: {}, statusCode: 529 }));
    expect(await outcomeOf(model)).toMatchObject({ status: "unavailable" });
  });

  it("AC-INTAKE-08: модель не відповідає вчасно — недоступний", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async ({ abortSignal }) => {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 5_000);
          abortSignal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(abortSignal.reason);
          });
        });
        throw new Error("unreachable");
      },
    });
    expect(await outcomeOf(model, { timeoutMs: 50 })).toMatchObject({ status: "unavailable", message: ASSISTANT_UNAVAILABLE_MESSAGE });
  });
});
