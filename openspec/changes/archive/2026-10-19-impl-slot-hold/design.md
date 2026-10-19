# Design: impl-slot-hold

## Context

- Специфікація: `openspec/specs/slot-holds/spec.md` і `openspec/specs/clients/spec.md` (зміна
  `2026-10-19-add-slot-hold`), AC-HOLD-01 … AC-HOLD-19; вимоги PM — знімок 2026-10-19.
- Відповідей PM на Q1–Q3 (Sofiia-pm/therapy-scheduling-spec#3, #4, #5) ще немає. Реалізуємо текст PM як є; де він
  мовчить, діють власні припущення з `docs/spec-reading.md`, а AC, яких стосуються питання, лишаються
  «відкладено (чекаю відповідь PM на Q…)», доки відповідь не прийде через `/requirements-sync`.
- Стек фіксований (`AGENTS.md`): Next.js 16 App Router без Cache Components, Supabase (Postgres + Auth + RLS),
  Vitest без бази. Міграції застосовує лише CI (`db-check` → merge → `db-deploy`).
- Користувачів створює `npm run users:demo` уже після міграцій, тож міграція не може посилатися на `id` терапевтів.

## Goals / Non-Goals

**Goals:**

- Кожен AC-HOLD-01 … 19: код + тест з AC ID у назві + рядок у `docs/conformance.md`.
- Права з матриці `requirements/product.md` — у базі: RLS на кожній таблиці, явні GRANT, колонкові GRANT.
- Утримання й підтвердження атомарні: перевірка й запис — одна функція Postgres; двоє одночасних утримань одного слоту
  не створюють двох утримань (AC-HOLD-04).

**Non-Goals:**

- Редагування доступності, типи сеансів, документи згоди, повторювані сеанси, сповіщення (Non-goals специфікації).
- Фонова задача прострочення: статус рахуємо за часом створення під час читання.
- Тести бази в CI (потрібен Docker для `supabase start`) — див. Risks.

## Decisions

### 1. Ролі (міграція задачі 1)

`profiles.role` ∈ `admin` / `scheduler` / `therapist` замість `member` / `admin` шаблону. Порядок, як у заголовку
`20261012000000_profiles_and_roles.sql`: зняти `profiles_role_check` → `update … set role = 'therapist' where role =
'member'` → `default 'therapist'` (найменші права) → новий `profiles_role_check`. `supabase/demo-users.json`:
`admin@example.test`, `scheduler1@example.test`, `scheduler2@example.test`, `therapist1@example.test`,
`therapist2@example.test` (усі AC; AC-HOLD-04 і AC-HOLD-03 потребують двох планувальників).

Хелпер `private.is_staff()` (`security definer`, `search_path = ''`): роль ∈ admin, scheduler.

### 2. Модель даних

| Таблиця | Ключові колонки | AC |
|---|---|---|
| `clients` | `full_name` (не порожнє), `email`; унікальний індекс `lower(email)`; `created_by` default `auth.uid()` | 10, 11, 15, 16 |
| `therapist_availability` | `therapist_email`, `weekday` (1–7), `start_hour`, `end_hour`; сид у міграції для therapist1/therapist2 | 01, 18 |
| `holds` | `therapist_id` → profiles, `slot_start` timestamptz, `client_id` → clients, `created_at`, `created_by`, `confirmed_at`, `confirmed_by` | 02–09, 12–14, 17, 19 |

- **Слоти не зберігаємо:** слоти дня — це години доступності терапевта на вибраний день (60 хвилин з початку
  години, America/Los_Angeles); доступність прив'язана до email терапевта, бо профілі з'являються після міграцій.
- **Статус утримання похідний** (`holdStatus(hold, now)`): `confirmed_at` є → «Confirmed»; інакше `now <
  created_at + 1440 хв` → «Held», інакше «Expired». Слот вільний, якщо немає утримання зі статусом «Held» чи
  «Confirmed». Межі: о 14:29 — «Held», о 14:30 — «Expired» (AC-HOLD-05, AC-HOLD-06); 1440 хвилин рахуємо від
  моменту (timestamptz), тож перехід на літній/зимовий час дає «Held until» на годину інший, як у Assumptions.
- **Час показу** — `Intl.DateTimeFormat` з `timeZone: "America/Los_Angeles"`, формат `YYYY-MM-DD HH:mm`.

### 3. Права: GRANT + RLS

| Таблиця | select | insert | update | delete |
|---|---|---|---|---|
| `clients` | admin, scheduler — усі; therapist — клієнти власних утримань | admin, scheduler (колонки `full_name`, `email`) | — | — |
| `therapist_availability` | усі автентифіковані | — | — | — |
| `holds` | admin, scheduler — усі; therapist — лише `therapist_id = auth.uid()` | лише через `hold_slot` | лише через `confirm_hold` | — |
| `profiles` | + admin, scheduler бачать профілі терапевтів (ім'я в списку) | — | — | — |

- На `holds` прямих insert/update для `authenticated` немає: запис лише функціями нижче.

### 4. Утримання й підтвердження — функції Postgres

- `public.hold_slot(p_therapist_id uuid, p_slot_start timestamptz, p_client_id uuid)` — `security definer` у
  `private` з обгорткою в `public` (`security invoker`), `set search_path = ''`:
  1. роль не admin/scheduler → помилка `NOT_STAFF` (AC-HOLD-08);
  2. `pg_advisory_xact_lock` за (терапевт, початок слоту) — одночасні виклики йдуть по черзі (AC-HOLD-04);
  3. `p_slot_start <= now()` → `SLOT_STARTED` (AC-HOLD-07; межа включно — власне припущення);
  4. слот не входить у доступність терапевта → `SLOT_UNKNOWN`;
  5. є утримання «Held» чи «Confirmed» → `SLOT_UNAVAILABLE` (AC-HOLD-03, AC-HOLD-04, AC-HOLD-17);
  6. insert → повертає утримання (AC-HOLD-02, AC-HOLD-19).
- `public.confirm_hold(p_hold_id uuid)`: роль → `NOT_STAFF_CONFIRM` (AC-HOLD-14); `select … for update`; прострочене →
  `HOLD_EXPIRED` (AC-HOLD-13); інакше `confirmed_at = now()`, `confirmed_by = auth.uid()` (AC-HOLD-12, AC-HOLD-19).
- Server actions мапують коди на тексти PM дослівно: `SLOT_UNAVAILABLE` → «This slot is no longer available.»,
  `SLOT_STARTED` → «This slot has already started and cannot be held.», `NOT_STAFF` → «Only schedulers and admins can
  hold slots.», `HOLD_EXPIRED` → «This hold has expired. Hold the slot again.», `NOT_STAFF_CONFIRM` → «Only schedulers
  and admins can confirm holds.».

### 5. Картка клієнта

`validateClient(name, email)` → «Enter the client's name and a valid email.» для порожнього імені чи email без
`@`/домену (AC-HOLD-11, AC-HOLD-15) — до запиту в базу; порушення унікального індексу (`23505`) → «A client with this
email already exists.» (AC-HOLD-16).

### 6. Сторінки й server actions

| Шлях | Хто | Що | AC |
|---|---|---|---|
| `/clients` | admin, scheduler | список і форма створення (`createClientAction`) | 10, 11, 15, 16 |
| `/slots?therapist=…&date=…` | admin, scheduler | слоти дня зі статусами, «Held until», кнопки Hold / Confirm, «No free slots on this day.» | 01–08, 12–14, 17–19 |
| `/my-schedule` | therapist | власні утримання й сеанси на 7 днів від сьогодні (власне припущення) | 09 |

Авторизація — `getClaims()` і роль з `profiles`; сесія — `src/proxy.ts`.

### 7. Тести (Vitest, без бази)

- Доменні функції (`holdStatus`, `buildDaySlots`, `validateClient`, `formatLA`, мапінг кодів помилок) — чисті
  функції з фіксованим `now`.
- Server actions — з підміненим `@/lib/supabase/server` (`vi.mock`): перевіряємо, що дія викликає потрібний `rpc` і
  показує текст PM на кожен код помилки.
- SQL (RLS, `hold_slot`, `confirm_hold`) перевіряє `db-check`: усі міграції на одноразовій базі.

## Risks / Trade-offs

- **SQL без автотестів у CI** → логіку дублюємо в домені й тестуємо там; руками проходимо AC на preview трьома
  ролями; залишковий ризик записуємо в PR.
- **Відповіді PM на Q1–Q3 можуть змінити поведінку** (підтвердження після початку слоту, порожній день, видимість
  «Expired») → AC-HOLD-06, AC-HOLD-12, AC-HOLD-13, AC-HOLD-18 реалізуємо за текстом PM; після відповіді — нова зміна
  специфікації (MODIFIED) і окремий PR.
- **Доступність за email** → якщо терапевта перейменують, слоти «зникнуть»; прийнятно для зрізу 1 (редагування
  доступності поза зрізом).
