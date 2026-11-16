import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases (модель Anthropic, ADR 0003). Ніколи не частина `npm test` / CI:
// основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
// .env.local → process.env лише для цього прогону (Node 24); значень не друкуємо. Файлу немає — eval пропускається.
try {
  process.loadEnvFile(".env.local");
} catch {
  // немає .env.local
}

export default defineConfig(() => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    fileParallelism: false, // по одному запиту
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
}));
