# Tasks

Перед кожним PR: `npm run lint`, `typecheck`, `test`, `build`, `spec:check`, `ac:coverage`, `check:design`,
`check:auth`; рядки `docs/conformance.md` для AC задачі; `@coderabbitai review` і відповідь на кожну знахідку.

## 1. Чернетка картки (AI-функція)

- [x] 1.1 ADR 0003 і залежності `ai`, `@ai-sdk/anthropic`, `zod`, `server-only` (точні версії); `.env.example`.
- [x] 1.2 `src/lib/ai/`: схема, промпт з версією, `proposeIntake` з мапінгом збоїв, `anthropic.ts` (server-only).
- [x] 1.3 `src/lib/intake.ts`: `buildIntakeDraft` — правила коду (дата, тип, email, Missing); unit-тести.
- [x] 1.4 Дія `requestIntakeDraft` (роль до виклику моделі) і форма «Client request» на `/clients/new`.
- [x] 1.5 `tests/fixtures/golden/cases.json` (GC-01…10 PM), живий `RECORD=1 npm run eval` → `recorded.json` і звіт
  `evals/reports/`; `tests/golden.test.ts`, тести збоїв і ін'єкції, `tests/ai-key.test.ts`.
  Done when: AC-INTAKE-01, 02, 04, 05, 06, 07, 08, 09 — тести зелені, рядки «реалізовано».

## 2. Прод і UAT

- [x] 2.1 `ANTHROPIC_API_KEY` у Vercel Production; прод на SHA `main`.
- [x] 2.2 UAT на проді: AC-INTAKE-03 (чернетка без дії людини не створює картку) і AC-INTAKE-06 (відмова);
  звіт у `docs/qa/uat/<дата>/` (зроблено `docs/qa/uat/2026-11-16/`: ще AC-INTAKE-01 і AC-INTAKE-09).
  Done when: AC-INTAKE-03 — тест зелений, рядок «реалізовано»; archive `impl-client-intake`.
