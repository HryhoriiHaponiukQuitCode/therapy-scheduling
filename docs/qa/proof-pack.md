# QA proof pack: зріз 2 — «Планувальник заповнює картку клієнта з анкети, а терапевт бачить картки лише своїх клієнтів»

<!-- Шаблон: koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md. Заповнюється по кроках
WS8 (A → B → C → D). Посилання — на коміти (…/blob/<sha>/…#L<N>), PR і прогони. Жодних паролів; акаунти — *@example.test. -->

- Прод-URL: https://therapy-scheduling-two.vercel.app
- Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-27
  (`requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md`)
- `/api/health` на момент UAT: заповнюється в PR кроку C

## 3 AC

Усі три — зрізу 2 (AC-CARD-*). Рядків `відкладено (e2e — WS8)` у `docs/conformance.md` на старті WS8 не було: усі 60 AC
— «реалізовано» з тестами Vitest; обрано ті, де «Тоді» видно лише в браузері, а правило живе в SQL або TS.

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-CARD-05 | відмова в браузері: чужі дані за прямим посиланням | therapist1 бачить повідомлення «You don't have access to this client.», жодних даних client9 не показано, і картка client9 не змінилася |
| AC-CARD-06 | відмова в браузері: заборонена роль | форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася |
| AC-CARD-16 | стан інтерфейсу: помилка з дослівним текстом за роллю | scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів |

## A. Ворота

- PR воріт: https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/pull/43 (розбір знахідок — в описі PR)
- Зелений `quality` на `main`: https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/actions/runs/40852708722
- Обов'язкові перевірки в `solo-main` з 29.10.2026: `spec`, `app`, `conformance`, `db-check`, «Ворота: fallow audit»,
  «Покриття: доменна підлога». «Порада: вразливі залежності» — дорадча.

Розбір першого повного прогону `fallow` на `main` (той самий — в описі PR воріт): до —
`dead-code (2 issues), dupes (5 clone groups), health (32 above threshold)`; після — `dead-code (1 issue), dupes (5), health (32)`.

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| невикористаний експорт `AC_ID_GLOBAL` (`scripts/lib/spec-lib.mjs`) | 1 | справжня | виправлено: прибрано (жоден скрипт і тест не імпортує) |
| невикористаний файл `src/lib/supabase/client.ts` | 1 | справжня для поточного коду | лишено з поясненням: браузерний клієнт шаблону, частина структури `AGENTS.md`; видалення — окремим PR за погодженням |
| дублі `combobox` / `select` / `account-menu` | 3 | справжня | лишено: рефакторинг примітивів UI поза PR воріт; нові дублі ворота ловлять |
| дубль `globals.css` `:root` ↔ `.dark` | 1 | навмисна | ті самі токени в двох темах (CSS без міксинів) |
| дубль обходу файлів у `check-auth-boundary` / `check-design-tokens` | 1 | справжня, мала | лишено: перевірки WS7, не змінюються в PR воріт |
| складність у коді застосунку (`SlotsPage`, `validateClientCard`, `Combobox`, `Select` …) | 24 | справжні сигнали; CRAP без покриття — оцінка | лишено: ворота валять лише нову складність |
| складність у скриптах (шаблон: `check-spec`, `create-demo-users`; наші: `check-design-tokens`, `check-auth-boundary`) | 8 | навмисна / чужий код | лишено, у `health.ignore` не додано: нові зміни в них ворота мають бачити |
| `@tailwindcss/turbopack`, `@vitest/coverage-v8` (з матеріалів) | 2 | хибна | `ignoreDependencies`: підключено рядком у `next.config.ts` / провайдер за назвою з конфігу |

Тестові правила лінтера (`@vitest/eslint-plugin` 1.6.27, `error`): перший прогін — 3 помилки, усі справжні, виправлено в
PR воріт (мок власного модуля `@/lib/roles` у тесті AC-CARD-02; умовний `return` у двох тестах бази).

## B. Якість тестів

### Рівень для кожного AC

Посилання — на коміт `dd1fdfd` гілки `task/test-quality`.

| AC | Де живе правило | Рівень | Чому | Тест |
|---|---|---|---|---|
| AC-CARD-05 | політика RLS `clients_select_own_therapist` ([міграція](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/supabase/migrations/20261027192525_therapist_own_clients.sql#L11)); текст — `missingCardMessage` ([clients.ts](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/src/lib/clients.ts#L158)); сторінка `/clients/[id]` | **база (PGlite)** + SQL-мутант; **e2e** для тексту на сторінці | відмову тримає RLS: лише справжній SQL доводить, що чужого рядка немає; TS-копія чи мок `from()` лишились би зеленими без правила | [client-access.test.ts#L78](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/db/client-access.test.ts#L78) (`asUser` therapist1 → 0 рядків; update → `permission denied`; `asService` — ім'я не змінилось) |
| AC-CARD-06 | сторінка `/clients/new` → `pageAccess` ([roles.ts](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/src/lib/roles.ts#L36)); дія `createClientCard`; RLS `clients_insert_staff` ([міграція](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/supabase/migrations/20261027190554_client_cards.sql#L89)) | **база (PGlite)** для «кількість не змінилась» + SQL-мутант; **unit** ядра дії (роль → без insert); **e2e** для сценарію «форму не показано» | три шари можуть втратити правило окремо: сторінка (форма), дія (запит в обхід сторінки), RLS (запит в обхід застосунку) | [client-cards.test.ts#L61](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/db/client-cards.test.ts#L61), [clients.test.ts#L235](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/clients.test.ts#L235) |
| AC-CARD-16 | `isClientId` / `UUID_PATTERN` і `missingCardMessage` ([clients.ts#L158-L167](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/src/lib/clients.ts#L158-L167)); сторінка `/clients/[id]` | **unit** сторінки з підміненим клієнтом Supabase + Stryker; **база** — рядка немає ні для кого; **e2e** | вибір тексту за роллю й розпізнавання посилання — чистий TS з межами (схожі на UUID посилання); сам рядок вирішує RLS | [clients-page.test.ts#L113](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/clients-page.test.ts#L113), [#L131](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/clients-page.test.ts#L131), [#L147](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/clients-page.test.ts#L147), [client-access.test.ts#L137](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/db/client-access.test.ts#L137) |

### Покриття

`npm run test:coverage` на `dd1fdfd` (усього: рядки 39,3 % — 472 з 1201; гілки 38,85 %; поріг на загальний відсоток не
ставимо). Підлога 90/85/90/90 — на `clients`, `guest-route`, `slots`, `stats`, `theme`.

| Файл за AC | Рядки | Гілки | Чим доведено, якщо не покрито |
|---|---|---|---|
| `src/lib/clients.ts` (AC-CARD-05, 06, 16 — тексти, `isClientId`) | 97 % | 88 % | — (у підлозі) |
| `src/lib/roles.ts` (`pageAccess`, AC-CARD-06) | 100 % | 80 % | — |
| `src/app/(app)/clients/[id]/page.tsx` (AC-CARD-05, 16) | 93 % (було 50 % на `main`) | 61 % (було 16 %) | гілка «помилка запиту» — не з цих AC |
| `src/app/(app)/clients/actions.ts` (AC-CARD-06) | 94 % | 80 % | — |
| `src/app/(app)/clients/new/page.tsx` (AC-CARD-06) | 0 % | 0 % | e2e (`tests/e2e/client-access.spec.ts`, PR кроку C) і тест бази `client-cards.test.ts#L61` |
| політики RLS `clients_select_own_therapist`, `clients_insert_staff` | — (JS-покриття не бачить SQL) | — | SQL-мутації C1, C3 нижче |

### Доказ мутацією

TS — Stryker 10.1.1, `npm run mutation:ts -- --mutate src/lib/clients.ts,src/lib/roles.ts`:

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| `clients.ts:162` `UUID_PATTERN` без `^` (посилання `x<uuid>` — «картка») | AC-CARD-16 | вижив | [clients-page.test.ts#L131](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/clients-page.test.ts#L131): «зайвий символ перед UUID» — текст за роллю, без даних, без запиту | убитий |
| `clients.ts:162` без `$` (`<uuid>x`) | AC-CARD-16 | вижив | той самий тест, «зайвий символ після UUID» | убитий |
| `clients.ts:162` група без квантора (`[0-9a-f]` замість `{4}`, ×5) | AC-CARD-16 | вижили | «укорочена третя група» (#L131) і «правильне посилання, але картки немає» ([#L147](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/blob/dd1fdfd/tests/clients-page.test.ts#L147)) | убиті |
| `clients.ts:162` група `[^0-9a-f]` (×5) — справжнє посилання не розпізнається | AC-CARD-16 (і AC-CARD-10) | вижили | «правильне посилання, але картки немає» (запит до бази є) + AC-CARD-10 «наявну картку дитини» | убиті |
| `clients.ts:165` `isClientId` з порожнім тілом | AC-CARD-16 (і AC-CARD-10) | вижив | ті самі два тести | убитий |

- Stryker `src/lib/clients.ts`: **75,74 % → 83,43 %** (вижилих на рядках 162 і 165: **13 → 0** — 12 `Regex` і 1
  `BlockStatement`; у повідомленні коміту `3b267ee` помилково написано «9 → 0»). `roles.ts`: 72,00 % → 72,00 % —
  мутанти `pageAccess` (рядки 36–47, AC-CARD-06) убиті ще до WS8; вижилі в `roles.ts` — `isAppRole` і
  `isStaff`, `getCurrentUser` (рядки 11, 18, 51–66), поза цими 3 AC. Тести писала окрема сесія агента з тексту AC (maker ≠ checker),
  кожен мутант перевірено вручну: тест червоний на мутанті, зелений на коді.
- Решта вижилих у `clients.ts` — `validateClientCard`, межі довжини, `NOT_PROVIDED` — поза цими 3 AC; не прибрано й
  не вимкнено.
- SQL-мутації (`npm run mutation:sql -- --markdown`):

| Мутант | AC | Що зламано | Вердикт | Який тест упав |
|---|---|---|---|---|
| C1 | AC-CARD-05 | `clients_select_own_therapist`: «роль therapist і є власне утримання» → `true` (терапевт бачить будь-яку картку) | KILLED | AC-CARD-05, а також AC-CARD-04, 08, 09, 11, 14 (`tests/db/client-access.test.ts`) |
| C2 | AC-CARD-05 | прибрано `h.therapist_id = (select auth.uid())` | SURVIVED (еквівалентний, прийнято) | — |
| C3 | AC-CARD-06 | `clients_insert_staff`: `private.is_staff()` → `true` (терапевт створює картку запитом) | KILLED | AC-CARD-06: терапевт не створює картку навіть запитом в обхід сторінки |

- Еквівалентні мутанти: **C2** — підзапит до `holds` виконується під RLS того, хто дивиться; для терапевта єдина
  політика select на `holds` — `holds_select_own_therapist` «using (therapist_id = (select auth.uid()))»
  (`20261019105344_availability_and_holds.sql:111`), тож без умови в `clients_select_own_therapist` результат той
  самий. Умова лишається як захист на випадок зміни RLS `holds`. Причина — у `scripts/mutants.mjs` (`expect: "survive"`).
- P1/P2 з матеріалів не взято: свій PGlite-гарнес з WS6–WS7, `tests/db/profiles-db.test.ts` немає.

## C. UAT на проді

Заповнюється в PR кроку C (`task/uat`).

## D. Eval рецензента

Заповнюється після eval рецензента.
