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

Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-27

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-HOLD-10 | планувальник створює клієнта з іменем і новим email | `src/app/(app)/clients/actions.ts` (addClient), `supabase/migrations/20261019102511_roles_and_clients.sql`, `src/app/(app)/slots/data.ts` (toClientOptions) | `tests/clients.test.ts`, `tests/holds.test.ts` | реалізовано |
| AC-HOLD-11 | порожнє ім'я — клієнта не створено, повідомлення | `src/lib/clients.ts` (validateClient) | `tests/clients.test.ts` | реалізовано |
| AC-HOLD-15 | email без @ — клієнта не створено, повідомлення | `src/lib/clients.ts` (validateClient) | `tests/clients.test.ts` | реалізовано |
| AC-HOLD-16 | дублікат email — клієнта не створено, повідомлення | `src/lib/clients.ts` (clientInsertErrorMessage), `supabase/migrations/20261019102511_roles_and_clients.sql` | `tests/clients.test.ts` | реалізовано |
| AC-HOLD-01 | слоти дня зі статусами, утримати можна лише вільний | `src/lib/slots.ts` (buildDaySlots), `src/app/(app)/slots/page.tsx` | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-18 | день без вільних слотів — повідомлення | `src/lib/slots.ts` (hasFreeSlots), `src/app/(app)/slots/page.tsx` | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-02 | утримання вільного слоту на 24 години з «Held until» | `src/app/(app)/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-03 | слот уже утримано — нове утримання не створюється | `src/app/(app)/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-04 | одночасне утримання — рівно одне утримання | `src/app/(app)/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-17 | повторне утримання за тим самим клієнтом не змінює «Held until» | `src/app/(app)/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-07 | слот, що вже почався, утримати не можна | `src/app/(app)/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-05 | за хвилину до спливу 24 годин — досі «Held» | `src/lib/slots.ts` (holdStatus) | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-06 | після 24 годин — «Expired», слот вільний | `src/lib/slots.ts` (holdStatus, buildDaySlots) | `tests/slots.test.ts` | реалізовано |
| AC-HOLD-12 | підтвердження непростроченого утримання — «Confirmed» | `src/app/(app)/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-13 | прострочене утримання не підтверджується | `src/app/(app)/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-08 | терапевт не може утримати слот | `src/app/(app)/slots/actions.ts` (holdSlot), `supabase/migrations/20261019111956_hold_slot.sql` | `tests/holds.test.ts` | реалізовано |
| AC-HOLD-14 | терапевт не може підтвердити утримання | `src/app/(app)/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-19 | адміністратор утримує й підтверджує, як планувальник | `src/app/(app)/slots/actions.ts` (confirmHold), `supabase/migrations/20261019125609_confirm_hold.sql` | `tests/confirm.test.ts` | реалізовано |
| AC-HOLD-09 | терапевт бачить лише власний розклад | `src/app/(app)/my-schedule/data.ts` (loadMySchedule), `supabase/migrations/20261019204522_therapist_clients.sql` | `tests/my-schedule.test.ts` | реалізовано |
| AC-HOLD-24 | день без жодного слоту (субота 2026-11-07) — лише повідомлення | `src/lib/slots.ts` (buildDaySlots), `src/app/(app)/slots/page.tsx` | `tests/clarify.test.ts` | реалізовано |
| AC-HOLD-22 | підтвердження після початку слоту — відмова, «Held» | `src/app/(app)/slots/actions.ts` (confirmHold), `supabase/migrations/20261019195754_confirm_before_start.sql` | `tests/clarify.test.ts` | реалізовано |
| AC-HOLD-23 | підтвердження за хвилину до початку — «Confirmed» | `src/app/(app)/slots/actions.ts` (confirmHold), `supabase/migrations/20261019195754_confirm_before_start.sql` | `tests/clarify.test.ts` | реалізовано |
| AC-HOLD-20 | планувальник бачить прострочене утримання «Expired» | `src/lib/slots.ts` (expiredHolds), `src/app/(app)/slots/page.tsx` | `tests/clarify.test.ts` | реалізовано |
| AC-HOLD-21 | прострочене утримання не в розкладі терапевта | `src/app/(app)/my-schedule/data.ts` (loadMySchedule), `src/lib/slots.ts` (buildDaySlots) | `tests/my-schedule.test.ts` | реалізовано |
| AC-HOLD-25 | утримання клієнта, що перетинається з його «Held» в іншого терапевта, — відмова | — | — | відкладено (чекає реалізації) |
| AC-HOLD-26 | прострочене утримання клієнта не заважає новому на той самий час | — | — | відкладено (чекає реалізації) |
| AC-HOLD-27 | scheduler2 підтверджує утримання, створене scheduler1 | — | — | відкладено (чекає реалізації) |
| AC-HOLD-28 | прострочене утримання видно планувальнику за хвилину до початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-29 | прострочене утримання не показується з моменту початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-30 | терапевт бачить поточний тиждень пн–нд з усіма слотами й статусами | — | — | відкладено (чекає реалізації) |
| AC-HOLD-31 | терапевт перемикається на наступний тиждень | — | — | відкладено (чекає реалізації) |
| AC-HOLD-32 | слоти, що почалися без активного утримання, — «Past», утримати не можна | — | — | відкладено (чекає реалізації) |
| AC-HOLD-33 | «No free slots on this day.» серед «Past», «Held» і «Confirmed» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-34 | дублікат email з великими літерами й пробілами — відмова | — | — | відкладено (чекає реалізації) |
| AC-HOLD-35 | email зберігається й показується малими літерами без пробілів | — | — | відкладено (чекає реалізації) |
| AC-HOLD-36 | повторне чи одночасне підтвердження — «This hold is already confirmed.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-37 | повторне утримання простроченого слоту за тим самим клієнтом | — | — | відкладено (чекає реалізації) |
| AC-HOLD-38 | список утримань — лише «Held» і «Expired» за часом слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-39 | інші некоректні email — клієнта не створено | — | — | відкладено (чекає реалізації) |
| AC-HOLD-40 | у розкладі терапевта — ім'я клієнта без email (без речення про список клієнтів) | — | — | відкладено (чекає реалізації) |
| AC-HOLD-41 | ім'я лише з пробілів — порожнє; пробіли по краях прибираються | — | — | відкладено (чекає реалізації) |
| AC-HOLD-42 | утримання «Held», чий слот почався, не показується в списку | — | — | відкладено (чекає реалізації) |
| AC-CARD-01 | картка дорослого з анкети, клієнта можна вибрати під час утримання | — | — | відкладено (чекає реалізації) |
| AC-CARD-02 | картка дитини з опікуном; під час утримання дитину знаходять за email опікуна, біля неї — email опікуна | — | — | відкладено (чекає реалізації) |
| AC-CARD-03 | картка дитини без імені чи email опікуна — відмова, дані лишаються | — | — | відкладено (чекає реалізації) |
| AC-CARD-04 | терапевт бачить картки лише своїх клієнтів («Held» до початку слоту, «Confirmed» без обмеження) | — | — | відкладено (чекає реалізації) |
| AC-CARD-05 | картка чужого клієнта — «You don't have access to this client.» | — | — | відкладено (чекає реалізації) |
| AC-CARD-06 | терапевт не бачить форми нової картки — одразу відмова, картку не створено | — | — | відкладено (чекає реалізації) |
| AC-CARD-07 | без входу — лише сторінка входу за прямими посиланнями | `src/lib/supabase/proxy.ts`, `src/lib/request-user.ts` (getPageAccess), `src/lib/roles.ts` (pageAccess); GRANT `clients`, `holds` без anon | `tests/db/access.test.ts`, `tests/page-access.test.ts` | реалізовано |
| AC-CARD-08 | після прострочення утримання клієнт зникає зі списку терапевта | — | — | відкладено (чекає реалізації) |
| AC-CARD-09 | терапевт без клієнтів — порожній стан | — | — | відкладено (чекає реалізації) |
| AC-CARD-10 | планувальник і адміністратор бачать усі картки | — | — | відкладено (чекає реалізації) |
| AC-CARD-11 | користувач без ролі — лише повідомлення про відсутність доступу й «Sign out» | `supabase/migrations/20261027161014_roles_nullable.sql`, `src/components/no-access.tsx`, `src/app/(app)/layout.tsx`, `src/lib/roles.ts` (pageAccess) | `tests/db/access.test.ts`, `tests/page-access.test.ts` | реалізовано |
| AC-CARD-12 | кілька помилок у картці дитини — усі повідомлення одразу біля полів, дані лишаються | — | — | відкладено (чекає реалізації) |
| AC-CARD-13 | дублікат картки дитини (ім'я без регістру й пробілів, дата, email опікуна) — відмова | — | — | відкладено (чекає реалізації) |
| AC-CARD-14 | утримання «Held» робить клієнта своїм лише до початку слоту, «Confirmed» — без обмеження | — | — | відкладено (чекає реалізації) |
| AC-CARD-15 | порожній список клієнтів для планувальника й адміністратора — повідомлення | — | — | відкладено (чекає реалізації) |
| AC-CARD-16 | картка, якої не існує: планувальнику — «doesn't exist», терапевту — «no access» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-43 | прострочене утримання лишається в списку поруч із новим за іншим клієнтом до початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-44 | терапевт на сторінках слотів і утримань планувальника — «Only schedulers and admins can view this page.» | `src/app/(app)/slots/page.tsx` (слоти й панель утримань «Expired holds» — зараз єдиний список утримань планувальника), `src/lib/roles.ts` (pageAccess), RLS `holds_select_own_therapist`; нова сторінка `/holds` (задача 5) має ту саму перевірку й тест, інакше рядок повертається у «відкладено» | `tests/db/access.test.ts`, `tests/page-access.test.ts` | реалізовано |
