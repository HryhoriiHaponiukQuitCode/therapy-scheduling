import { createAnthropic } from "@ai-sdk/anthropic";

// Модель продукту — Anthropic claude-haiku-5-5 (ADR 0003: ключ Anthropic розробника замість безкоштовних моделей
// OpenRouter). Ланцюжка fallback немає: одна модель; недоступна — AC-INTAKE-08.
export const PRODUCT_MODEL = "claude-haiku-5-5";

// Фабрика приймає ключ параметром і НЕ читає process.env: так її імпортує живий eval.
// У коді застосунку модель бере лише src/lib/ai/anthropic.ts (server-only).
export function makeProductModel(apiKey: string) {
  return createAnthropic({ apiKey })(PRODUCT_MODEL);
}
