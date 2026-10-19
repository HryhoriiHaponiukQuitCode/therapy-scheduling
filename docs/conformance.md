# Матриця відповідності (AC → код → тест → статус)

<!--
Ваша матриця: один рядок на кожен AC з openspec/specs/** — вашої специфікації, у яку ви перекладаєте вимоги PM
(їхній знімок у requirements/ приносить команда агента /requirements-sync).
Рядок «Вимоги» під цим коментарем заповнює лише /requirements-sync: адреса репо вимог PM, звідки взято вимоги (issues
або файли docs/), і дата знімка, через « · ». Руками його не змінюйте: з нього /requirements-sync знає, звідки брати
вимоги наступного разу, а скіли spec-clarify, spec-review і /conformance — куди ставити питання й яку версію вимог ви
реалізуєте. Рядків таблиці /requirements-sync не додає.
Рядки змінюєте ви:
  PR «Специфікація» — після archive зміни: рядок кожного нового AC зі статусом «відкладено (чекає реалізації)»; рядки AC,
                      прибраних зі специфікації (REMOVED), — видалити;
  PR «Реалізація»   — рядок AC задачі в тому самому PR, що й код і тест.
Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — PR «Специфікація» без нових рядків або рядок видалено);
  MISSING    статус «реалізовано», а непропущеного тесту, назва якого починається з цього AC ID, у файлах
             *.test.ts / *.test.tsx немає (*.spec.ts і допоміжні файли Vitest не запускає — вони не рахуються);
  ORPHAN     тест посилається на AC, якого немає в специфікації (AC прибрано або вимогу PM ще не перекладено);
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі;
і попереджає, не падаючи: AC з вимог PM (requirements/), якого ще немає в openspec/specs/, — «вимогу PM ще не перекладено
в специфікацію».

Приклад рядків (усередині коментаря — скрипт їх не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаю відповідь PM на Q2, <pm>/<team-slug>-spec#5) |
| AC-LEAVE-07 | менеджер бачить лише свій відділ | — | — | відкладено (рішення PM: поза зрізом 1, <pm>/<team-slug>-spec#8) |
| AC-LEAVE-10 | діапазон лише із заблокованих днів | — | — | відкладено (чекає реалізації) |
-->

Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-19

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-HOLD-10 | планувальник створює клієнта з іменем і новим email | `src/app/clients/actions.ts` (addClient), `supabase/migrations/20261019102511_roles_and_clients.sql`, `src/app/slots/data.ts` (toClientOptions) | `tests/clients.test.ts`, `tests/holds.test.ts` | реалізовано |
| AC-HOLD-11 | порожнє ім'я — клієнта не створено, повідомлення | `src/lib/clients.ts` (validateClient) | `tests/clients.test.ts` | реалізовано |
| AC-HOLD-15 | email без @ — клієнта не створено, повідомлення | `src/lib/clients.ts` (validateClient) | `tests/clients.test.ts` | реалізовано |
| AC-HOLD-16 | дублікат email — клієнта не створено, повідомлення | `src/lib/clients.ts` (clientInsertErrorMessage), `supabase/migrations/20261019102511_roles_and_clients.sql` | `tests/clients.test.ts` | реалізовано |
| AC-HOLD-01 | слоти дня зі статусами, утримати можна лише вільний | `src/lib/slots.ts` (buildDaySlots), `src/app/slots/page.tsx` | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-18 | день без вільних слотів — повідомлення | `src/lib/slots.ts` (hasFreeSlots), `src/app/slots/page.tsx` | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-02 | утримання вільного слоту на 24 години з «Held until» | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-03 | слот уже утримано — нове утримання не створюється | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-04 | одночасне утримання — рівно одне утримання | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-17 | повторне утримання за тим самим клієнтом не змінює «Held until» | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-07 | слот, що вже почався, утримати не можна | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-05 | за хвилину до спливу 24 годин — досі «Held» | `src/lib/slots.ts` (holdStatus) | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-06 | після 24 годин — «Expired», слот вільний | `src/lib/slots.ts` (holdStatus, buildDaySlots) | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-12 | підтвердження непростроченого утримання — «Confirmed» | `src/app/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-13 | прострочене утримання не підтверджується | `src/app/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-08 | терапевт не може утримати слот | `src/app/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-14 | терапевт не може підтвердити утримання | `src/app/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-19 | адміністратор утримує й підтверджує, як планувальник | `src/app/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-09 | терапевт бачить лише власний розклад | — | — | відкладено (чекає реалізації) |
| AC-HOLD-24 | день без жодного слоту — лише повідомлення | — | — | відкладено (чекає реалізації) |
| AC-HOLD-22 | підтвердження після початку слоту — відмова, «Held» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-23 | підтвердження за хвилину до початку — «Confirmed» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-20 | планувальник бачить прострочене утримання «Expired» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-21 | прострочене утримання не в розкладі терапевта | — | — | відкладено (чекає реалізації) |
