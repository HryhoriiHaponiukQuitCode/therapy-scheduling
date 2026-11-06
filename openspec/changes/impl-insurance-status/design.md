# Design: impl-insurance-status

## Context

Зріз 3 додає до наявної картки клієнта одне поле: статус перевірки страхування. Специфікація —
`openspec/specs/client-insurance/spec.md` (AC-INS-01…06). Що вже є і що беремо як є:

- картка клієнта `/clients/[id]` (`src/app/(app)/clients/[id]/page.tsx`) і правила доступу до неї зі зрізу 2: що
  видно, вирішує RLS (`clients_select_staff`, `clients_select_own_therapist`);
- ролі з `profiles.role`, хелпери `private.is_staff()` і `private.current_app_role()`;
- `getCurrentUser()` / `getPageAccess()` з `getClaims()`;
- тестова база PGlite (`tests/db/supabase-pglite.ts`: `asUser`, `asAnon`, `asService`) і конвеєр UAT з WS8
  (`tests/e2e/`, `npm run uat`).

На `public.clients` зараз немає жодного `grant update` для `authenticated` і немає політики `update`: картку після
створення ніхто не змінює. Зріз 3 відкриває рівно одну колонку на зміну і лише для staff.

ADR `0001-auth-boundary` і `0002-router-cache` діють без змін; нового ADR не потрібно.

## Goals / Non-Goals

**Goals:**

- статус видно в картці рядком «Insurance: <статус>» усім, хто бачить картку (AC-INS-01, AC-INS-04);
- планувальник і адміністратор змінюють статус, бачать «Insurance status saved.» (AC-INS-02, AC-INS-03);
- терапевт не змінює статус ні в інтерфейсі, ні напряму в обхід сторінок (AC-INS-04, AC-INS-05);
- без входу — лише сторінка входу (AC-INS-06);
- повернути «Not set» не можна; у розкладі терапевта статусу немає (вимоги специфікації без окремого AC).

**Non-Goals:** історія змін статусу, страхова компанія й поліс, вплив статусу на утримання, пошук і фільтр за
статусом, документи згоди (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#34, пізніший зріз).

## UI і компоненти

| Сторінка | Роль | Що видно | AC |
|---|---|---|---|
| `/clients/[id]` | admin, scheduler | рядок «Insurance: <статус>» під даними анкети; під ним форма: `Select` з «Verified», «Not accepted», «Private pay» і кнопка «Save» (`SubmitButton`, `primary`); після збереження — `ActionMessage` «Insurance status saved.» | AC-INS-01, AC-INS-02, AC-INS-03 |
| `/clients/[id]` | therapist (свій клієнт) | той самий рядок «Insurance: <статус>», форми немає | AC-INS-04 |
| `/clients/[id]` | therapist (чужий клієнт) | як у зрізі 2: «You don't have access to this client.» | — (AC-CARD-05) |
| `/clients/[id]` | не увійшов | `src/proxy.ts` перенаправляє на `/login` | AC-INS-06 |
| `/my-schedule` | therapist | без змін: статусу страхування немає | вимога «Терапевт лише бачить статус» |

- **Рядок статусу** — суцільний текст `Insurance: <статус>` в одному елементі (`data-testid="insurance-status"`), щоб
  e2e перевіряв дослівний текст AC. Статус — текстом, не лише кольором (`DESIGN.md`, розділ 1). Нового токена не
  треба.
- **Форма** — нова клієнтська частина `insurance-status-form.tsx` поруч зі сторінкою: `useActionState` з дією
  `setInsuranceStatus`, `Select` і `SubmitButton` з `@/components/ui`. «Not set» у списку немає: повернути його не
  можна. Поточний статус — вибраний за замовчуванням, якщо він не «Not set».
- **Каркас** (`shell.tsx`, `loading.tsx`) не змінюється: рядок статусу — усередині панелі картки.
- Після збереження `revalidatePath("/clients/[id]", "page")`: повторне відкриття показує новий статус (AC-INS-02).

## Дані й RLS

Одна міграція на задачу. Застосованих міграцій не змінюємо.

### Статус у картці (задача 1, міграція `client_insurance_status`) — AC-INS-01, AC-INS-06

| Колонка | Тип і обмеження | AC |
|---|---|---|
| `insurance_status` | `text not null default 'not_set'`, check `clients_insurance_status_check` ∈ `not_set`, `verified`, `not_accepted`, `private_pay` | AC-INS-01 |

- Наявні картки (зрізи 1–2) отримують `not_set` через `default` під час `add column` — так каже припущення PM.
- Читання — наявний `grant select on public.clients to authenticated` і політики `select` зрізів 1–2: нова колонка
  видна тим самим, кому видна картка. `anon` прав не має (AC-INS-06).
- Колонковий `grant insert` не змінюємо: при створенні картки статус завжди `not_set` за `default`.

### Зміна статусу (задача 2, міграція `client_insurance_update`) — AC-INS-02, AC-INS-03, AC-INS-05

- `grant update (insurance_status) on public.clients to authenticated` — колонковий: інші поля картки, як і раніше,
  ніхто не змінює.
- Політика `clients_update_insurance_staff`:

  ```sql
  create policy clients_update_insurance_staff
    on public.clients for update to authenticated
    using ((select private.is_staff()))
    with check ((select private.is_staff()) and insurance_status <> 'not_set');
  ```

  - `using` — змінювати може лише admin або scheduler (AC-INS-02, AC-INS-03). Терапевт під RLS не бачить рядка для
    update: `update` змінює 0 рядків, статус той самий (AC-INS-05).
  - `with check … <> 'not_set'` — повернути «Not set» не можна (вимога «Позначення статусу…»): база відповідає
    `42501`.
- Окремої функції `rpc` не треба: один запис в одну колонку, перевірку й запис робить один `update`.

## Auth

- **Сторінка `/clients/[id]`** — як у зрізі 2: `getPageAccess()` → роль з `profiles` за `claims.sub`. Форму
  показуємо лише для `isStaff(role)` (AC-INS-04). Це UX: захист — RLS і дія.
- **Server Action `setInsuranceStatus(clientId, formData)`** (`src/app/(app)/clients/[id]/actions.ts`), порядок:
  1. `getCurrentUser()` → `getClaims()`; немає claims → `redirect("/login")` без запису (AC-INS-06);
  2. роль не staff → «Only schedulers and admins can change the insurance status.» без запису (AC-INS-05);
     формулювання наше: PM тексту для цієї відмови не задав, бо терапевту форму не показуємо;
  3. `parseInsuranceStatus(value)` — лише `verified`, `not_accepted`, `private_pay`, інакше помилка без запису;
  4. `update … set insurance_status … where id = clientId` клієнтом користувача з `.select("id")`; 0 рядків →
     «This client doesn't exist.» (немає картки або RLS не пустила);
  5. успіх → «Insurance status saved.» (AC-INS-02).
  - Правило `npm run check:auth` вимагає `getCurrentUser(` до першого `.from(` — дія його виконує.
- **Admin-клієнт не потрібен.** `SUPABASE_SECRET_KEY` у зрізі 3 не використовуємо.

## Доменний модуль

`src/lib/insurance.ts` — без React і Supabase, щоб тестувати unit:

- `INSURANCE_STATUSES`: значення бази → текст PM (`not_set` → «Not set», `verified` → «Verified», `not_accepted` →
  «Not accepted», `private_pay` → «Private pay»);
- `insuranceLine(status)` → «Insurance: <текст>» (AC-INS-01, AC-INS-04);
- `parseInsuranceStatus(value)` — лише три значення для позначення, «Not set» — ні;
- `canChangeInsurance(role)` — `isStaff(role)` (AC-INS-04);
- тексти повідомлень: `INSURANCE_SAVED_MESSAGE` = «Insurance status saved.» тощо.

Файл додаємо в `FLOORED` у `vitest.coverage.config.mts` (підлога покриття WS8), щойно тести його піднімуть.

## Тести

| AC | Рівень | Що перевіряє тест |
|---|---|---|
| AC-INS-01 | база + unit + e2e | нова картка має `not_set` (PGlite); `insuranceLine("not_set")` = «Insurance: Not set»; на екрані «Insurance: Not set» |
| AC-INS-02 | база + unit + e2e | scheduler1 змінює на `verified`, повторне читання — `verified`; спроба повернути `not_set` → `42501`; на екрані «Insurance status saved.» і «Insurance: Verified» після перезавантаження |
| AC-INS-03 | база + e2e | admin1 змінює на `private_pay`, scheduler2 читає `private_pay`; на екрані обидва бачать «Insurance: Private pay» |
| AC-INS-04 | база + unit + e2e | therapist1 читає статус свого клієнта; `canChangeInsurance("therapist")` = false; на екрані немає форми |
| AC-INS-05 | база | `asUser(therapist1)` `update` → 0 рядків, scheduler1 читає той самий `not_accepted` |
| AC-INS-06 | база + e2e | `asAnon` select / update → permission denied, статус незмінний; без входу пряме посилання веде на `/login` |

- Назва кожного тесту починається з AC ID; очікування в `expect` — значення з «Тоді».
- Тести відмов (AC-INS-05, AC-INS-06 і «Not set» в AC-INS-02) пише нова сесія агента або до коду (maker ≠ checker).
- **Доказ, що тест здатен упасти:** SQL-мутанти в `scripts/mutants.mjs` для нової міграції задачі 2 —
  `using (true)` замість `is_staff()` (має вбити AC-INS-05) і без `<> 'not_set'` (має вбити AC-INS-02);
  `npm run mutation:sql` → `KILLED`.
- **e2e** — `tests/e2e/client-insurance.spec.ts`: назва з AC ID, анотація `ac`, тег `@uat`, `given` / `when` /
  `thenStep`, «Тоді» дослівно з AC PM. Дані — синтетичні `uat-<запуск>@example.test` з прибиранням після себе.

## Risks / Trade-offs

- **UAT змінює статус на проді** → картку для AC-INS-02, AC-INS-03 створює сам тест (`uat-…@example.test`) і прибирає
  її після прогону. AC-INS-05 на проді не відтворюємо: його доводить тест бази.
- **Колонковий `grant update`** → якщо пізніше знадобиться змінювати інші поля картки, кожне поле — окремим grant у
  новій міграції, а не `grant update` на всю таблицю.
- **«Not set» у формі немає** → інтерфейс не надсилає такого запиту. Якщо хтось надішле його в обхід форми,
  `parseInsuranceStatus` відмовить ще до бази, а база відповість `42501`; показуємо загальний текст помилки.
