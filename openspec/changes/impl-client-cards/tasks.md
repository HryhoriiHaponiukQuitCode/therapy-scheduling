# Tasks

Вертикальні задачі: міграція + дія + сторінка + тести, кожна — один PR «Реалізація» (гілка `task/<коротко>`). Перед PR:

- `npm run lint`, `typecheck`, `test`, `build`, `spec:check`, `ac:coverage`, `check:design`;
- рядки `docs/conformance.md` для AC задачі — у тому самому PR.

## 1. Ролі, доступ і тестова база

- [ ] 1.1 Тестова база: `@electric-sql/pglite@0.5.8` (devDependency, спитати перед встановленням) і
  `tests/db/supabase-pglite.ts` з демо (адаптувати; `asUser`, `asAnon`, `asService`).
- [ ] 1.2 Міграція `roles_nullable` (drop-first: constraint → дані → `drop not null` / `drop default` → новий
  constraint).
- [ ] 1.3 `supabase/demo-users.json`: `admin1`, `newuser1` (`role: null`), `pm-admin@`, `pm-scheduler@`,
  `pm-therapist@example.test`. `create-demo-users.mjs` приймає явний `null`.
- [ ] 1.4 `getPageAccess()` і `pageAccess()` (`src/lib/request-user.ts`, `src/lib/roles.ts`):
  - `NoAccess` з «Sign out» у layout і на сторінках;
  - відмова на `/slots` для терапевта;
  - пункти смуги за роллю.
- [ ] 1.5 Тести відмов з AC ID: AC-CARD-07 (`asAnon`), AC-CARD-11 (0 рядків; власна роль не змінюється), AC-HOLD-44
  (утримання іншого терапевта — 0 рядків; `pageAccess`).
- [ ] 1.6 Мутаційна перевірка: локальна таблиця. У CI — червоний прогін AC-CARD-11:
  - `mutation:` — тимчасовий `grant update (full_name, role)` у новій міграції;
  - потім revert.
  Done when: AC-CARD-07, AC-CARD-11, AC-HOLD-44 — тести зелені, рядки «реалізовано»; після merge — зелений
  `db-deploy` і `npm run users:demo`.

## 2. Повна картка клієнта

- [ ] 2.1 Міграція `client_cards`:
  - колонки й нормалізація наявних рядків;
  - `clients_contact_by_type`, `clients_email_normalized`, `clients_full_name_trimmed`;
  - тригер нової картки, `clients_child_identity_key`;
  - колонковий `grant insert`; перестворена `clients_insert_staff`.
- [ ] 2.2 `validateClientCard` (усі помилки полів одразу, тексти PM), мапінг 23505 за назвою індексу.
- [ ] 2.3 Дія `createClientCard`: `getClaims` → роль → дані → insert.
- [ ] 2.4 Сторінка `/clients/new`: відмова терапевту без форми. Швидку форму `/clients` прибрати.
- [ ] 2.5 Тести відмов з AC ID:
  - AC-CARD-06 — PGlite, кількість карток незмінна;
  - AC-CARD-13, AC-HOLD-16, AC-HOLD-34 — PGlite, 23505;
  - AC-CARD-03, AC-CARD-12, AC-HOLD-11, AC-HOLD-15, AC-HOLD-39, AC-HOLD-41 — `validateClientCard` і constraint.
- [ ] 2.6 Мутаційна перевірка: локальна таблиця. У CI — червоний прогін AC-CARD-06:
  - `mutation:` — `with check (true)` у `clients_insert_staff` нової міграції;
  - потім revert.
  Done when: AC-CARD-01, AC-CARD-03, AC-CARD-06, AC-CARD-12, AC-CARD-13, AC-HOLD-10, AC-HOLD-11, AC-HOLD-15,
  AC-HOLD-16, AC-HOLD-34, AC-HOLD-35, AC-HOLD-39, AC-HOLD-41.

## 3. Список і картка клієнта за роллю

- [ ] 3.1 Міграція `therapist_own_clients`: перестворена `clients_select_own_therapist` («Held» лише до початку слоту,
  «Confirmed» — без обмеження).
- [ ] 3.2 `/clients` за роллю, порожні стани обох ролей.
- [ ] 3.3 `/clients/[id]`: «Not provided», `clientCardMessage` для неіснуючої та чужої картки.
- [ ] 3.4 Тести відмов з AC ID: AC-CARD-05, AC-CARD-08, AC-CARD-14 (PGlite, 0 рядків, дані незмінні), AC-CARD-16
  (`clientCardMessage`).
- [ ] 3.5 Тести дозволених дій: AC-CARD-04, AC-CARD-09, AC-CARD-10, AC-CARD-15.
- [ ] 3.6 Мутаційна перевірка: локальна таблиця. У CI — червоний прогін AC-CARD-05:
  - `mutation:` — `using (true)` у `clients_select_own_therapist`;
  - потім revert.
  Done when: AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-09, AC-CARD-10, AC-CARD-14, AC-CARD-15, AC-CARD-16.

## 4. Пошук клієнта й правила утримання

- [ ] 4.1 Міграція `hold_slot_client_busy`: `create or replace private.hold_slot` — блокування за клієнтом і часом,
  `CLIENT_BUSY`.
- [ ] 4.2 Мапінг тексту «This client already has a hold or session at this time.».
- [ ] 4.3 Пошук клієнта на `/slots` (`q`: ім'я, email, email опікуна; біля дитини — email опікуна).
- [ ] 4.4 Тести відмов з AC ID: AC-HOLD-25 (PGlite: `CLIENT_BUSY`, утримань не додалось), AC-HOLD-36 (PGlite:
  `HOLD_CONFIRMED`, `confirmed_at` незмінний).
- [ ] 4.5 Тести дозволених дій: AC-HOLD-26, AC-HOLD-27, AC-HOLD-37, AC-CARD-02.
- [ ] 4.6 Мутаційна перевірка: локальна таблиця (прибрати перевірку `CLIENT_BUSY` у новій міграції → AC-HOLD-25
  червоний).
  Done when: AC-CARD-02, AC-HOLD-25, AC-HOLD-26, AC-HOLD-27, AC-HOLD-36, AC-HOLD-37.

## 5. Статус «Past», список утримань і тиждень терапевта

- [ ] 5.1 Міграція `weekday_availability`: сид пн–пт 09:00–16:00, горизонт 8 тижнів у `hold_slot`.
- [ ] 5.2 Функція `my_schedule`: лише ім'я клієнта, без email.
- [ ] 5.3 Статус «Past» у `buildDaySlots` і `StatusBadge`.
- [ ] 5.4 `holdsList` і сторінка `/holds` (відмова терапевту — як у 1.4).
- [ ] 5.5 `/my-schedule` — тиждень пн–нд з перемиканням.
- [ ] 5.6 Дата в тесті AC-HOLD-24 — 2026-11-07.
- [ ] 5.7 Тести:
  - AC-HOLD-28, AC-HOLD-29, AC-HOLD-38, AC-HOLD-42, AC-HOLD-43 — `holdsList` з фіксованим `now`;
  - AC-HOLD-30, AC-HOLD-31, AC-HOLD-32, AC-HOLD-33 — чисті функції;
  - AC-HOLD-40 — PGlite: `my_schedule` без email; терапевт не бачить чужого розкладу.
- [ ] 5.8 Мутаційна перевірка: локальна таблиця (перевірка ролі в `private.my_schedule`).
- [ ] 5.9 Знімки за ролями. Наприкінці — `npx openspec archive impl-client-cards -y` до merge.
  Done when: AC-HOLD-24, AC-HOLD-28, AC-HOLD-29, AC-HOLD-30, AC-HOLD-31, AC-HOLD-32, AC-HOLD-33, AC-HOLD-38,
  AC-HOLD-40, AC-HOLD-42, AC-HOLD-43; `npm run ac:coverage` — OK, усі AC зрізу «реалізовано» або «відкладено
  (причина)».
