# Tasks

Вертикальні задачі: міграція + дія + сторінка + тести, кожна — один PR «Реалізація» (гілка `task/<коротко>`). Перед PR:

- `npm run lint`, `typecheck`, `test`, `build`, `spec:check`, `ac:coverage`, `check:design`, `check:auth`;
- рядки `docs/conformance.md` для AC задачі — у тому самому PR;
- `@coderabbitai review` і відповідь на кожну знахідку; після merge — зелений `db-deploy`.

## 1. Статус у картці

- [ ] 1.1 Міграція `client_insurance_status`: колонка `insurance_status` з `default 'not_set'` і check на чотири
  значення.
- [ ] 1.2 Типи БД: `database.types.ts` з Summary job `db-check` (або `npm run db:types`).
- [ ] 1.3 `src/lib/insurance.ts`: `INSURANCE_STATUSES`, `insuranceLine`, тексти; unit-тести.
- [ ] 1.4 `/clients/[id]`: рядок «Insurance: <статус>» (`data-testid="insurance-status"`) для всіх ролей, що бачать
  картку.
- [ ] 1.5 Тести з AC ID:
  - AC-INS-01 — PGlite: нова картка й картка зрізу 2 мають `not_set`; unit `insuranceLine`;
  - AC-INS-06 — PGlite `asAnon`: читання статусу → permission denied, статус незмінний.
  Done when: AC-INS-01, AC-INS-06 — тести зелені, рядки «реалізовано».

## 2. Зміна статусу

- [ ] 2.1 Міграція `client_insurance_update`: `grant update (insurance_status)` і політика
  `clients_update_insurance_staff` (`using is_staff`, `with check is_staff and <> 'not_set'`).
- [ ] 2.2 `parseInsuranceStatus`, `canChangeInsurance`; unit-тести.
- [ ] 2.3 Дія `setInsuranceStatus`: `getCurrentUser` → роль → значення → `update … select("id")` → «Insurance status
  saved.».
- [ ] 2.4 Форма `insurance-status-form.tsx` (`Select` + `SubmitButton` + `ActionMessage`) лише для staff.
- [ ] 2.5 Тести з AC ID (відмови — нова сесія агента або до коду):
  - AC-INS-02 — PGlite: scheduler1 ставить `verified`, повторне читання; повернення `not_set` → `42501`;
  - AC-INS-03 — PGlite: admin1 ставить `private_pay`, scheduler2 читає те саме;
  - AC-INS-04 — PGlite: therapist1 читає статус свого клієнта; unit `canChangeInsurance("therapist")` = false;
  - AC-INS-05 — PGlite `asUser(therapist1)`: `update` → 0 рядків, статус незмінний для scheduler1.
- [ ] 2.6 SQL-мутанти в `scripts/mutants.mjs`: `using (true)` (вбиває AC-INS-05), без `<> 'not_set'` (вбиває
  AC-INS-02); `npm run mutation:sql` → `KILLED`, таблиця в описі PR.
- [ ] 2.7 `insurance` — у `FLOORED` (`vitest.coverage.config.mts`).
  Done when: AC-INS-02, AC-INS-03, AC-INS-04, AC-INS-05.

## 3. UAT на проді й proof pack

- [ ] 3.1 `tests/e2e/client-insurance.spec.ts`: специфікація на кожен AC-INS-01…06 (назва з AC ID, анотація `ac`,
  тег `@uat`, «Тоді» дослівно); дані `uat-<запуск>@example.test` з прибиранням.
- [ ] 3.2 Прогін на проді `npm run uat -- --url <прод>`, рецензент наосліп, звіт у `docs/qa/uat/<дата>/`
  (`report.md`, `manifest.json`, `frames/`), відео — в описі PR.
- [ ] 3.3 Негативний контроль `npm run uat:nc` → FAIL.
- [ ] 3.4 `docs/qa/proof-pack.md` за шаблоном WS9: рядок на кожен AC-INS і розділ «Не перевірено».
- [ ] 3.5 `docs/qa/retro-ws9.md`: до 10 рядків «що б ми взяли з фабрики».
- [ ] 3.6 Archive `impl-insurance-status` (`npx openspec archive impl-insurance-status -y`).
  Done when: AC-INS-01, AC-INS-02, AC-INS-03, AC-INS-04, AC-INS-05, AC-INS-06 — UAT-рядок і рядок proof pack.
