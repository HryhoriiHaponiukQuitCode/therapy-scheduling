# Design: impl-client-cards

## Context

- **Специфікація** — `openspec/specs/clients/spec.md`, `client-access/spec.md`, `slot-holds/spec.md`. Вимоги PM —
  знімок 2026-10-27 (Sofiia-pm/therapy-scheduling-spec#19, #2). Відкритих питань немає: усі #20–#31 закрито 26.10.
- **Що вже є з зрізу 1** (`2026-10-19-impl-slot-hold`):
  - ролі `admin`/`scheduler`/`therapist` у `profiles.role`, хелпери `private.is_staff()`, `private.current_app_role()`;
  - таблиця `clients` (ім'я та email, швидка форма на `/clients`), `therapist_availability`, `holds`;
  - функції `hold_slot` і `confirm_hold`, сторінки `/slots`, `/my-schedule`.
  - `confirm_hold` уже повертає `HOLD_CONFIRMED` (AC-HOLD-36) і не перевіряє автора утримання (AC-HOLD-27) — бракує
    лише тестів.
- **Рішення PM, що змінюють код:**
  - лише повна форма картки (#20);
  - помилки полів одразу (#21);
  - email опікуна може повторюватися (#22);
  - «Held» робить клієнта своїм лише до початку слоту (#25);
  - перетин — у межах однієї картки (#26);
  - користувач без ролі — повідомлення і «Sign out» (#29);
  - пошук дитини за email опікуна (#31);
  - доступність — пн–пт 09:00–16:00 (припущення PM у #2).
- **Стек фіксований** (`AGENTS.md`):
  - міграції застосовує лише CI;
  - тести бази — PGlite у Vitest (`@electric-sql/pglite@0.5.8`, нова devDependency — спитати перед встановленням);
  - вигляд — лише `DESIGN.md`.

## Goals / Non-Goals

**Goals:**

- Кожен AC зі статусом «відкладено (чекає реалізації)» отримує код, тест з AC ID і рядок «реалізовано».
- Кожна відмова, правило якої живе в SQL, має тест бази на PGlite (`asUser` / `asAnon`). Тест перевіряє і відмову, і
  незмінні дані (`asService`).
- Права — у базі: RLS на кожну операцію, revoke + явні GRANT, колонкові GRANT. Сторінка й дія лише показують текст PM.

**Non-Goals:**

- Редагування й видалення карток, пошук і фільтри в списку клієнтів (Non-goals специфікації).
- Керування ролями в застосунку, запрошення, Admin API.
- e2e-тести інтерфейсу — WS8; стани інтерфейсу без автотесту підтверджуємо знімками за ролями.

## UI і компоненти

Примітиви — лише `@/components/ui`: `Button`, `SubmitButton`, `Input`, `Label`, `Field`, `Select`, `Panel`,
`StatusBadge`, `Avatar`, `Skeleton`. Складені — `PageHeader`, `EmptyState`, `ActionMessage`, `ChoiceList`, `DayGrid`,
`SlotCard` з `src/components/`. Кольори — лише токени `DESIGN.md`; новий токен — спершу в `DESIGN.md` (розділ 9).
Тексти — дослівно з AC.

| Сторінка | Хто бачить | Що показано | Порожній стан / відмова (текст AC) | AC |
|---|---|---|---|---|
| усі сторінки `(app)` | без входу | лише `/login` (редирект) | — | AC-CARD-07 |
| усі сторінки `(app)` | роль `null` | `NoAccess` без смуги навігації: `Panel` з текстом і `SubmitButton` «Sign out» (наявна дія `signOut`) | «Your account has no access yet. Contact an administrator.» | AC-CARD-11 |
| `/clients` | admin, scheduler | усі картки (ім'я, тип, мова; для дитини — опікун), `Button` «New client» → `/clients/new`; упорядкування за ім'ям — власне припущення з `docs/spec-reading.md` | `EmptyState`: «No clients yet. Create a client card from an intake form.» | AC-CARD-10, AC-CARD-15 |
| `/clients` | therapist | лише свої клієнти, без кнопки створення | `EmptyState`: «No clients yet. Clients appear here when a scheduler holds a slot with you.» | AC-CARD-04, AC-CARD-08, AC-CARD-09, AC-CARD-14 |
| `/clients/new` | admin, scheduler | повна форма: тип (`ChoiceList` Adult/Child), ім'я, дата народження (`Input type="date"`), мова (`Select` English/Spanish); для Adult — email, для Child — ім'я та email опікуна | помилки — `Field error` біля кожного поля, усі одразу; введене лишається у формі. Дублікат — `ActionMessage` над формою: «A client with this email already exists.» або «A client with these details already exists.» | AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-12, AC-CARD-13, AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35, AC-HOLD-39, AC-HOLD-41 |
| `/clients/new` | therapist | форми немає, одразу `Panel` з відмовою | «Only schedulers and admins can create client cards.» | AC-CARD-06 |
| `/clients/[id]` | admin, scheduler | усі дані анкети; «Not provided» для полів карток зрізу 1 | картки немає → «This client card doesn't exist.» | AC-CARD-10, AC-CARD-16 |
| `/clients/[id]` | therapist | усі дані анкети свого клієнта, зокрема email | чужа або неіснуюча картка → однаково «You don't have access to this client.» | AC-CARD-05, AC-CARD-08, AC-CARD-14, AC-CARD-16 |
| `/slots` | admin, scheduler | терапевти лише з роллю `therapist`; день зі статусами Free / Held / Confirmed / Past; вибір клієнта — пошук за ім'ям, email або email опікуна; біля дитини — email опікуна | «No free slots on this day.»; помилка утримання — `ActionMessage` «This client already has a hold or session at this time.» | AC-CARD-02, AC-HOLD-24, AC-HOLD-25, AC-HOLD-26, AC-HOLD-32, AC-HOLD-33 |
| `/holds` (нова) | admin, scheduler | список «Held» і «Expired», чиї слоти не почалися, за часом слоту; кнопка Confirm для «Held» | «No holds.» (власне формулювання для порожнього списку — PM тексту не задав) | AC-HOLD-27, AC-HOLD-28, AC-HOLD-29, AC-HOLD-36, AC-HOLD-37, AC-HOLD-38, AC-HOLD-42, AC-HOLD-43 |
| `/slots`, `/holds` | therapist | даних немає, `Panel` з відмовою | «Only schedulers and admins can view this page.» | AC-HOLD-44 |
| `/my-schedule?week=YYYY-MM-DD` | therapist | тиждень пн–нд, усі слоти зі статусами, «Previous week» / «Next week»; в утриманні — лише ім'я клієнта | «No slots on this day.» | AC-HOLD-30, AC-HOLD-31, AC-HOLD-40 |

- **Статус «Past».** `StatusBadge` отримує варіант `Past`: текст «Past» + іконка, на наявних токенах
  `bg-muted text-muted-foreground`. `SlotCard` — приглушена картка без кнопки Hold. Нового кольору немає.
- **Смуга навігації.** «Holds» — для admin і scheduler. «Clients» — для всіх ролей. «Slots» і «Holds» терапевт у
  смузі не бачить; прямі посилання охороняє сторінка (рядок AC-HOLD-44).

## Дані й RLS

Одна міграція на задачу. Застосованих міграцій не змінюємо: політики й функції замінюємо в новій міграції
(`drop policy` + `create policy`, `create or replace function`).

### Ролі (задача 1, міграція `roles_nullable`) — AC-CARD-11

Користувач без ролі — `profiles.role is null`. Порядок drop-first (заголовок `20261012000000_profiles_and_roles.sql`):

1. `drop constraint profiles_role_check`;
2. `update`: наявних даних без ролі немає — крок записуємо коментарем;
3. `alter column role drop not null` і `drop default` — тригер `on_auth_user_created` створює профіль без ролі;
4. новий `profiles_role_check`: `role is null or role in ('admin', 'scheduler', 'therapist')`.

Наслідки для хелперів:

- `private.is_staff()` для `null` — `false` (`coalesce`);
- `private.current_app_role()` — `null`;
- терапевтські політики дають 0 рядків, бо утримань із `therapist_id` такого користувача немає.

Колонковий `grant update (full_name)` на `profiles` лишається без змін: роль собі не підвищить ніхто (тест AC-CARD-11).

`supabase/demo-users.json`:

- `newuser1@example.test` з `"role": null` — `scripts/create-demo-users.mjs` приймає явний `null`;
- `admin1@example.test` — ім'я з AC;
- акаунти PM: `pm-admin@`, `pm-scheduler@`, `pm-therapist@example.test`.

### Картка клієнта (задача 2, міграція `client_cards`)

| Колонка | Тип і обмеження | AC |
|---|---|---|
| `client_type` | `text not null default 'adult'`, check ∈ `adult`, `child`; наявні картки — `adult` | AC-CARD-01, AC-CARD-02 |
| `birth_date` | `date`; `null` лише в картках зрізу 1 («Not provided») | AC-CARD-12 |
| `session_language` | `text`, check ∈ `English`, `Spanish` | AC-CARD-12 |
| `guardian_name`, `guardian_email` | `text`; email — формат і `= lower(btrim(…))` | AC-CARD-02, AC-CARD-03 |
| `email` | тепер `null` для дитини; `clients_email_normalized`: `email = lower(btrim(email))` | AC-HOLD-35 |
| `full_name` | `clients_full_name_trimmed`: `full_name = btrim(full_name)` | AC-HOLD-41 |

- **Перед новими constraint** — `update clients set email = lower(btrim(email)), full_name = btrim(full_name)`. Дублікатів
  це не створює: унікальний індекс уже на `lower(email)`.
- **`clients_contact_by_type`:**
  - `adult` → `email is not null`, полів опікуна немає;
  - `child` → `email is null`, `guardian_name` непорожнє, `guardian_email is not null`.
- **Тригер `clients_before_insert`** (`private.check_new_client_card()`, `security invoker`, `set search_path = ''`)
  діє лише на нові картки, тож картки зрізу 1 лишаються дійсними:
  - `birth_date` і `session_language` обов'язкові;
  - `birth_date` ≤ сьогодні в America/Los_Angeles (сьогодні — дозволено);
  - помилка — `CLIENT_CARD_INVALID`.
- **Дублікати:**
  - дорослий — наявний `clients_email_lower_key` (AC-HOLD-16, AC-HOLD-34);
  - дитина — частковий унікальний індекс `clients_child_identity_key` на `(lower(full_name), birth_date,
    guardian_email) where client_type = 'child'` (AC-CARD-13). Twins з різними іменами проходять. Email опікуна не
    унікальний (#22).
  - Перевірка й запис атомарні без функції: гонку двох однакових карток зупиняє сам індекс.
- **GRANT:** `revoke all` уже є. `grant insert (full_name, email, client_type, birth_date, session_language,
  guardian_name, guardian_email)`. `created_by` ставить default `auth.uid()`. Update і delete для `authenticated` не
  видаємо: картку не змінюють.
- **RLS:** `clients_insert_staff` перестворюємо в цій міграції (`private.is_staff()` і `created_by = auth.uid()`). Так
  мутаційна перевірка AC-CARD-06 має що послабити в новій міграції. Select-політики — у задачі 3.

### Свій клієнт терапевта (задача 3, міграція `therapist_own_clients`)

| Таблиця | select | insert | update | delete |
|---|---|---|---|---|
| `clients` | admin, scheduler — усі (`clients_select_staff`, AC-CARD-10, AC-CARD-15, AC-CARD-16); therapist — `clients_select_own_therapist` (нижче) | admin, scheduler (`clients_insert_staff`, AC-CARD-06) | — (немає grant) | — (немає grant) |
| `holds` | admin, scheduler — усі; therapist — лише власні (`holds_select_own_therapist`, AC-HOLD-44) | лише `hold_slot` | лише `confirm_hold` | — |
| `profiles` | власний; admin, scheduler — профілі терапевтів | — | лише `full_name` власного (AC-CARD-11) | — |
| `therapist_availability` | admin, scheduler — усі; therapist — власна | — | — | — |

- **`clients_select_own_therapist`** перестворюємо з правилом #25: `exists` утримання з `therapist_id = auth.uid()` і
  `(confirmed_at is not null or (now() < created_at + 1440 хв and now() < slot_start))`. Це AC-CARD-04, AC-CARD-05,
  AC-CARD-08, AC-CARD-14. Без входу (`anon`) на `clients` і `holds` grant немає → permission denied (AC-CARD-07).
- **Розклад терапевта** (задача 5) читає утримання функцією `public.my_schedule(p_from date, p_to date)`:
  - обгортка `security invoker` над `private.my_schedule` (`security definer`, `set search_path = ''`, перевірка
    `current_app_role() = 'therapist'` першим рядком);
  - повертає лише власні утримання й сеанси з `slot_start`, статусом і `full_name` клієнта, без email (AC-HOLD-40);
  - навіщо функція: утримання «Held», чий слот уже почався, лишається «Held» у розкладі до прострочення (AC-HOLD-42 для
    всіх ролей), а `clients_select_own_therapist` такого клієнта вже не показує. Тож ім'я дає функція, а не RLS
    `clients`.

### Утримання (задачі 4–5)

- **`hold_slot`** (`create or replace private.hold_slot`, задача 4):
  - друга advisory-блокировка за `(client_id, slot_start)`;
  - перевірка `CLIENT_BUSY` — у клієнта є утримання «Held» (не прострочене) чи «Confirmed» з тим самим `slot_start` у
    будь-якого терапевта. Слоти — 60 хвилин від початку години, тож перетин означає той самий початок.
  - Прострочені не враховуються (AC-HOLD-25, AC-HOLD-26). Діти одного опікуна — різні `client_id` (#26).
  - Текст — «This client already has a hold or session at this time.».
- **`confirm_hold`** не змінюємо: AC-HOLD-27 і AC-HOLD-36 — лише тести.
- **Доступність** (задача 5, міграція `weekday_availability`) — заміна сиду therapist1 і therapist2 на пн–пт
  09:00–16:00 (припущення PM у #2). Горизонт 8 тижнів:
  - `buildDaySlots` повертає порожній день далі за `today + 56 днів`;
  - `hold_slot` відмовляє `SLOT_UNKNOWN`.
- **Похідні статуси** (`src/lib/slots.ts`):
  - «Past» — слот почався (`slot_start ≤ now`) і не має активного утримання чи сеансу (AC-HOLD-32, AC-HOLD-33);
  - список утримань `holdsList(holds, now)` — «Held» і «Expired», чий слот ще не почався, за часом слоту (AC-HOLD-28,
    AC-HOLD-29, AC-HOLD-38, AC-HOLD-42);
  - прострочене приховуємо, лише якщо пізніше той самий клієнт утримав той самий слот (AC-HOLD-37). За іншим клієнтом
    обидва записи лишаються (AC-HOLD-43).

## Auth

- **`src/proxy.ts`** лише оновлює сесію й перенаправляє на `/login` без сесії. Це UX, не захист (AC-CARD-07).
- **Сторінки.** Кожна сторінка `(app)` викликає `getPageAccess()` (`src/lib/request-user.ts`): `getClaims()` і роль з
  `public.profiles` за `claims.sub`, один раз на запит (React `cache`). Далі:
  - немає claims → `redirect("/login")`;
  - роль `null` → `NoAccess` (AC-CARD-11);
  - роль не та → відмова з текстом AC (AC-CARD-06, AC-HOLD-44).
  - Layout теж показує `NoAccess` без смуги, але захист — сторінка й RLS, бо layout не рендериться на кожну навігацію.
- **Server Actions** — `createClientCard` (нова), `holdSlot`, `confirmHold` (наявні). Порядок у кожній:
  1. `getCurrentUser()` → `getClaims()` (не `getSession()`); немає claims → `redirect("/login")` без запису;
  2. роль з `profiles`, ніколи з `user_metadata`; роль не та → текст AC без запису;
  3. перевірка вхідних даних (`validateClientCard`, `checkHoldRequest`);
  4. запис клієнтом користувача — діють RLS і GRANT.
  - Сесію створюють `login` (`signInWithPassword`, `next` не приймає — після входу завжди `/`) і `signOut`. Кроків 1–2
    там немає.
- **Пошук клієнта під час утримання** — GET-параметр `q` сторінки `/slots`, без дії. Запит
  `or(full_name.ilike, email.ilike, guardian_email.ilike)` іде під RLS staff (AC-CARD-02).
- **Admin-клієнт (`SUPABASE_SECRET_KEY`) не потрібен.** Зріз не запрошує користувачів і не змінює ролей. Ключ — лише в
  `scripts/create-demo-users.mjs` локально, у Vercel його немає.
- **Роль ніколи не береться з `user_metadata`.** `handle_new_user` бере з метаданих лише `full_name`, а колонку `role`
  змінює тільки `service_role`.
- **Архітектурне правило (трек D)** — `scripts/check-auth-boundary.mjs` (`npm run check:auth`), новий job у
  `.github/workflows/architecture.yml`:
  - кожен файл з `"use server"` у `src/app` викликає `getCurrentUser(` або `getClaims(` до першого `.from(` / `.rpc(`,
    окрім дій зі списку `login`, `signOut`;
  - жодного `getSession(` у `src/`;
  - жодного `src/middleware.ts`;
  - жодного `SUPABASE_SECRET_KEY` у `src/`.
  - Доказ — червоний прогін на навмисному порушенні, потім revert.
- **Кандидат в ADR** — «Свій клієнт терапевта — політика RLS, а не фільтр у Server Action чи view». Варіанти: RLS +
  `security definer` функція для розкладу / фільтр у дії з admin-клієнтом / view з `security_invoker`. «Як
  перевіряємо» — тести AC-CARD-05, AC-CARD-14 на PGlite і правило `check:auth`.

## Тести

- **PGlite-гарнес** `tests/db/supabase-pglite.ts`:
  - взято з `koldovsky/2026-quitcode-06-leave-portal-demo@48337f0d64bb65498fc40de53156857796633fed`;
  - прибрано поля демо; додано `asAnon`;
  - застосовує всі `supabase/migrations/*.sql`, `seed.sql` і користувачів з `supabase/demo-users.json` (зокрема
    `newuser1` без ролі).
  - Час у тестах — відносно `now()` бази: утримання створюємо через `asService` з `created_at` і `slot_start` у
    минулому чи майбутньому.
- **Відмовні AC → тест бази** (`tests/db/*.test.ts`, перевірка відмови й незмінних даних):
  - AC-CARD-05, AC-CARD-08, AC-CARD-14 — 0 рядків і дані незмінні;
  - AC-CARD-06 — 42501, кількість карток та сама;
  - AC-CARD-07 — `asAnon`: permission denied;
  - AC-CARD-11 — 0 рядків клієнтів і утримань; update власної ролі → permission denied;
  - AC-CARD-13 — 23505 `clients_child_identity_key`;
  - AC-HOLD-16, AC-HOLD-34 — 23505;
  - AC-HOLD-25 — `CLIENT_BUSY`;
  - AC-HOLD-36 — `HOLD_CONFIRMED`;
  - AC-HOLD-44 — терапевт не бачить утримань іншого терапевта.
- **Відмова в сторінці чи дії** — тест чистої функції, яку вона викликає першою:
  - `validateClientCard` — AC-CARD-03, AC-CARD-12, AC-HOLD-11, AC-HOLD-15, AC-HOLD-39, AC-HOLD-41;
  - `pageAccess` — AC-CARD-06, AC-CARD-11, AC-HOLD-44;
  - `clientCardMessage` — AC-CARD-16.
- **Мутаційна перевірка:**
  - локально — для кожного відмовного AC задачі: таблиця в описі PR;
  - у CI — щонайменше два червоні прогони за зріз (`mutation:` коміт → червоний job `app` → `git revert`). Мутуємо
    лише нову міграцію PR або код дії.

## Risks / Trade-offs

- **PGlite спрощує Auth і JWT** (`auth.uid()` з `request.jwt.claim.sub`) → налаштування хмарного проєкту тест не
  перевіряє. Залишок закриваємо проходом зрізу на проді трьома ролями й знімками.
- **`now()` у політиці й функціях** → межі «до початку слоту» тестуємо відносним часом. Точні хвилини з AC (09:59 /
  10:00) — у чистих функціях з фіксованим `now`.
- **Картки зрізу 1 без дати й мови** → тригер перевіряє лише нові вставки. Старі показуємо як «Not provided» (припущення
  PM).
- **Нова devDependency `@electric-sql/pglite`** → точна версія `0.5.8`, лише в тестах. У описі PR — рядок «Поза межами
  типу «Реалізація» свідомо (домашка WS7, C): package.json, package-lock.json».
