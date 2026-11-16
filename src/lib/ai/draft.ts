import { APICallError, NoObjectGeneratedError, Output, RetryError, generateText, type LanguageModel } from "ai";
import { INTAKE_INSTRUCTIONS, wrapRequest } from "./prompts/intake";
import { IntakeExtractionSchema, type IntakeExtraction } from "./schema";

// Чиста функція: модель передають параметром. Застосунок — модель Anthropic (src/lib/ai/anthropic.ts), тести —
// MockLanguageModelV4 із записаною відповіддю. Тут немає `import "server-only"` і process.env.

export type IntakeFailure = "invalid_output" | "rate_limited" | "timeout" | "provider_error";

export type IntakeModelResult =
  | { ok: true; extraction: IntakeExtraction; modelId: string }
  | { ok: false; reason: IntakeFailure; message: string };

export type IntakeOptions = { maxRetries?: number; timeoutMs?: number };

export const INTAKE_TIMEOUT_MS = 20_000;

export async function proposeIntake(
  text: string,
  model: LanguageModel,
  opts: IntakeOptions = {},
): Promise<IntakeModelResult> {
  try {
    const result = await generateText({
      model,
      instructions: INTAKE_INSTRUCTIONS,
      messages: [{ role: "user", content: [{ type: "text", text: wrapRequest(text) }] }],
      output: Output.object({ name: "client_intake", schema: IntakeExtractionSchema }),
      temperature: 0,
      // Без повторів у циклі: ліміт чи збій постачальника повтором не виправити (AC-INTAKE-08).
      maxRetries: opts.maxRetries ?? 0,
      timeout: opts.timeoutMs ?? INTAKE_TIMEOUT_MS,
    });
    // result.output уже перевірено за схемою (інакше — NoObjectGeneratedError).
    return { ok: true, extraction: result.output, modelId: result.response.modelId };
  } catch (error) {
    return classifyError(error);
  }
}

export function classifyError(error: unknown): Extract<IntakeModelResult, { ok: false }> {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (NoObjectGeneratedError.isInstance(cause)) {
    return { ok: false, reason: "invalid_output", message: "model output did not match the schema" };
  }
  if (APICallError.isInstance(cause)) {
    // HTTP 200 з тілом помилки: код — у data.
    const code = cause.statusCode === 200 ? (cause.data as { code?: unknown } | undefined)?.code : cause.statusCode;
    if (code === 429 || code === "429") {
      return { ok: false, reason: "rate_limited", message: "model rate limit reached" };
    }
    return { ok: false, reason: "provider_error", message: `provider error ${String(code ?? "")}`.trim() };
  }
  if (cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")) {
    return { ok: false, reason: "timeout", message: "model did not answer in time" };
  }
  // Текст помилки постачальника не повертаємо: у ньому може бути службова інформація.
  return { ok: false, reason: "provider_error", message: "provider error" };
}
