import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases (модель Anthropic, ADR 0003). Ніколи не частина `npm test` / CI:
// основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
// З .env.local беремо лише ANTHROPIC_API_KEY (Node 24 parseEnv): інші секрети (SUPABASE_SECRET_KEY тощо) eval
// не потрібні й у process.env не потрапляють. Значень не друкуємо. Файлу чи ключа немає — eval пропускається.
const EVAL_ENV = ["ANTHROPIC_API_KEY"] as const;
try {
  const local = parseEnv(readFileSync(".env.local", "utf8"));
  for (const name of EVAL_ENV) {
    if (local[name] && !process.env[name]) process.env[name] = local[name];
  }
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
