import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases (модель Anthropic, ADR 0003). Ніколи не частина `npm test` / CI:
// основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    env: loadEnv(mode, process.cwd(), ""), // .env.local → process.env лише для цього прогону
    fileParallelism: false, // по одному запиту
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
}));
