# Пропозиція: план реалізації зрізу 2 «картка клієнта з обмеженим доступом»

## Why

Реалізуємо зріз 2 (WS7) за специфікацією `openspec/specs/clients/spec.md`, `openspec/specs/client-access/spec.md` і
`openspec/specs/slot-holds/spec.md`. Це переклад вимог Sofiia-pm/therapy-scheduling-spec#19 і #2, знімок вимог
2026-10-27, зміни специфікації `2026-10-25-add-client-cards`, `2026-10-25-clarify-slot-hold-ws7` і
`2026-10-27-clarify-client-cards`. Планувальник заводить повну картку клієнта з анкети. Терапевт бачить лише своїх
клієнтів. Утримання слоту враховує уточнення PM від 20–26.10.

## What Changes

План покриває всі AC зі статусом «відкладено (чекає реалізації)» у `docs/conformance.md`. Це п'ять вертикальних задач
(`tasks.md`), кожна окремим PR «Реалізація»:

1. Ролі, доступ і тестова база — AC-CARD-07, AC-CARD-11, AC-HOLD-44.
2. Повна картка клієнта:
   - AC-CARD-01, AC-CARD-03, AC-CARD-06, AC-CARD-12, AC-CARD-13;
   - AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35, AC-HOLD-39, AC-HOLD-41 — у повній формі.
3. Список і картка клієнта за роллю — AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-09, AC-CARD-10, AC-CARD-14,
   AC-CARD-15, AC-CARD-16.
4. Пошук клієнта й правила утримання — AC-CARD-02, AC-HOLD-25, AC-HOLD-26, AC-HOLD-27, AC-HOLD-36, AC-HOLD-37.
5. Статус «Past», список утримань і тиждень терапевта:
   - AC-HOLD-28, AC-HOLD-29, AC-HOLD-30, AC-HOLD-31, AC-HOLD-32, AC-HOLD-33, AC-HOLD-38, AC-HOLD-40, AC-HOLD-42,
     AC-HOLD-43;
   - нова дата в тесті AC-HOLD-24.

Специфікацію ця зміна не змінює (`skip_specs: true`).
