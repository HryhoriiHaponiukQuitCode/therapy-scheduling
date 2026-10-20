# Дизайн-система therapy-scheduling

Погоджений варіант: **«Mono + pastel» з лівою бічною панеллю** (варіант 5). Візуальний еталон — `docs/design/design-preview.html`
(відкрий у браузері; це статичний макет, не код застосунку). Цей файл — нормативний: якщо макет і текст розходяться,
правий текст.

## 1. Принципи

- Чітко, лаконічно, професійно. Біле й чорне — основа; пастель **лише** для статусів слотів і повідомлень про результат дії.
- Жодного брендового кольору, градієнтів, кольорових смуг зліва, емодзі, ілюстрацій. Тіні майже непомітні.
- Дві кнопки на все: чорна (основна дія) і біла з межею (другорядна).
- Статус ніколи не передається лише кольором: текст + іконка SVG + пастельний фон.
- Тексти PM, імена полів форм, `data-testid`, ролі `alert` / `status` і структура server actions **не змінюються**.

## 2. Токени

Усі кольори — CSS-змінні в `src/app/globals.css`; Tailwind бачить їх через `@theme inline`. Сирі класи палітри
Tailwind (`zinc-*`, `red-*`, `green-*`, `amber-*`, `bg-foreground` тощо) у `src/` після впровадження не лишаються.
Темна тема — через `@media (prefers-color-scheme: dark)`, як і зараз.

### 2.1 Кольори

| Токен | Світла | Темна | Призначення | Контраст (світла / темна) |
|---|---|---|---|---|
| `page` | `#f7f7f8` | `#0e0e10` | фон сторінки | — |
| `surface` | `#ffffff` | `#17171a` | картки, бічна панель, поля, спливаючі панелі | — |
| `subtle` | `#f4f4f5` | `#1e1e22` | активний пункт меню, hover, смуга вибору клієнта | — |
| `ink` | `#111113` | `#f2f2f3` | основний текст, заголовки, підписи | 17.62 / 17.24 на `page` |
| `muted` | `#5f6168` | `#a2a3aa` | вторинний текст, значення, підписи колонок | 5.78 / 7.67 на `page`, 5.63 на `subtle` |
| `border` | `#e6e6e9` | `#2a2a2f` | межі карток, роздільники (декор) | — |
| `border-strong` | `#8b8d94` | `#74757c` | межі полів і другорядних кнопок | 3.31 / 3.90 на `surface` (≥ 3:1) |
| `btn` | `#111113` | `#f2f2f3` | фон основної кнопки, вибраний день | — |
| `on-btn` | `#ffffff` | `#111113` | текст на `btn` | 18.86 / 16.86 |
| `focus` | `#111113` | `#f2f2f3` | focus ring | 17.62 / 17.24 |
| `success` / `success-bg` | `#1e5b3f` / `#e5f3eb` | `#a9dfc3` / `#16271e` | повідомлення успіху | 7.00 / 10.45 |
| `error` / `error-bg` | `#9f2528` / `#fbeaea` | `#f4a9a9` / `#2c1617` | помилки, межа невалідного поля | 6.52 / 8.99 |
| `status-free-fg` / `-bg` | `#1e5b3f` / `#e5f3eb` | `#a9dfc3` / `#16271e` | Free (мʼята) | 7.00 / 10.45 |
| `status-held-fg` / `-bg` | `#6e4c0a` / `#faf0d7` | `#ecd08f` / `#2a2210` | Held (вершкова) | 6.85 / 10.48 |
| `status-confirmed-fg` / `-bg` | `#3b3878` / `#ebeaf8` | `#c3c1f2` / `#212036` | Confirmed (лаванда) | 8.73 / 9.23 |
| `status-expired-fg` / `-bg` | `#4f5157` / `#efeff1` | `#c4c5ca` / `#232327` | Expired (камінь) | 6.91 / 9.09 |

### 2.2 Типографіка

- Один шрифт інтерфейсу — **Geist** (уже підключений у `layout.tsx` через `next/font`), час і дати — **Geist Mono**.
  Прибрати `font-family: Arial` з `body`; `body` бере `var(--font-sans)`.
- Ваги лише 400, 500, 600.
- Заголовок сторінки: 26/32, 600, `letter-spacing: -0.02em`. Заголовок картки: 16/22, 600. Текст: 14/20, 400.
  Підпис поля: 13/18, 600. Дрібний текст і підписи колонок: 12/16 (колонки — 600, `muted`).
- Пари «підпис / значення» (головна): підпис `ink` 600, значення `muted` 400.
- Час слоту: Geist Mono 15/20, 500. Дата `YYYY-MM-DD` у полі DatePicker — Geist Mono.

### 2.3 Відступи, радіуси, тіні

- Відступи: 4, 8, 12, 16, 20, 24, 28, 32, 40 px (шкала Tailwind). Між картками — 24px; padding картки — 28px
  (20px на телефоні); padding контенту — 40px (16px на телефоні).
- Радіуси: `radius-sm` 6px (бейджі, варіанти списку, дні календаря), `radius-md` 8px (поля, кнопки, повідомлення,
  пункти меню), `radius-lg` 12px (картки).
- Тіні: картка — `0 1px 2px rgba(17,17,19,.04)` (у темній темі — без тіні); спливаюча панель —
  `0 1px 2px rgba(17,17,19,.06), 0 12px 32px rgba(17,17,19,.10)`.

## 3. Каркас сторінки

- **AppShell** для всіх сторінок, крім `/login`: сітка `248px | 1fr`.
- **Бічна панель** (`aside`): фон `surface`, межа праворуч `border`, на всю висоту екрана й закріплена (`sticky`, `h-dvh`).
  Зверху — знак (чорний квадрат 28px з радіусом 7px і білою іконкою календаря) і назва «Practice scheduling».
  Далі `nav aria-label="Main"` з підписом «Menu» і пунктами з іконками 18px. Унизу — блок акаунта: коло з першою
  літерою email, email, роль, кнопка «Вийти» (secondary, на всю ширину; це наявна форма `signOut`).
- **Пункти меню за роллю** (як зараз на головній): staff (`admin`, `scheduler`) — Home, Clients, Slots;
  `therapist` — Home, My schedule. Пункт: висота 44px, радіус 8px, колір `muted`; hover — фон `subtle`;
  активний — фон `subtle`, `ink`, 600 і `aria-current="page"` (визначати через `usePathname` в окремому клієнтському
  компоненті `NavLink`). Поки триває перехід на пункт (`useLinkStatus`), його іконка стає спінером того ж розміру 18px.
- Посилання «Home» / «Back» у шапках сторінок прибрати: їх замінює меню.
- `/clients`, `/slots`, `/my-schedule` загортаються в AppShell у своєму `layout.tsx` (`SignedInShell`), а не на сторінці:
  під час переходу `loading.tsx` замінює лише контент, меню лишається.
- **Контент**: `max-width: 960px`, padding 40px; заголовок сторінки (`PageHeader`) і під ним опис `muted`.
- **До 860px**: панель стає верхнім рядком — знак і назва зліва, «Вийти» справа, пункти меню рядком нижче
  (горизонтальна прокрутка, якщо не влазять); email і роль ховаються. Горизонтальної прокрутки сторінки бути не повинно.

## 4. Компоненти (`src/components/`, без нових npm-залежностей; іконки — inline SVG)

| Компонент | Тип | Суть |
|---|---|---|
| `AppShell`, `Sidebar`, `NavLink` | server / server / client | каркас із розділу 3 |
| `PageHeader` | server | `title`, `description?` |
| `Card` | server | `title?`, `icon?`, `actions?`, `children`; `<section aria-labelledby>` |
| `Button` | server | `variant: "primary" \| "secondary" \| "ghost"`, `pending?` (спінер + `aria-busy`, `disabled`), решта пропсів `<button>` (зокрема `form`, `name`, `value`) |
| `Field` | server | `label`, `error?`, `children`; підпис звʼязаний з контролом |
| `Input` | server | межа `border-strong`, висота 44px, `aria-invalid` → межа `error` |
| `Select` | client | власний, **без нативного `<select>`** (див. 4.1) |
| `DatePicker` | client | власний, **без `<input type="date">`** (див. 4.2) |
| `StatusBadge` | server | `status: "Free" \| "Held" \| "Confirmed" \| "Expired"`; текст + іконка + пастельний фон |
| `ActionMessage` | наявний | API не змінювати; вигляд — плашка з іконкою: `success` на `success-bg`, `error` на `error-bg`; `role="alert"` / `role="status"` без `aria-live`; елемент лишається змонтованим |
| `EmptyState` | server | пунктирна рамка `border-strong`, іконка, текст (напр. «No free slots on this day.»), зберегти `role="status"` і `data-testid` |
| `SlotTable` | server | таблиця слотів (розділ 5) |
| `Skeleton`, `SkeletonField`, `SkeletonRows`, `LoadingStatus` | server | стан завантаження розділу в `loading.tsx`: блоки кольору `border` з `animate-pulse`, ті самі картки й заголовки, що на сторінці; `LoadingStatus` — `role="status"` «Loading…» для скрінрідера |

Іконки статусів (12px, stroke): Free — коло; Held — годинник; Confirmed — галочка; Expired — перекреслене коло.

### 4.1 Select

- Кнопка-тригер 44px (`border-strong`, радіус 8px, шеврон праворуч) + спливаючий `listbox` під нею.
- Патерн WAI-ARIA «select-only combobox»: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`;
  варіанти `role="option"` з `aria-selected`; вибраний позначено галочкою й вагою 600.
- Клавіатура: Enter / Space / ↓ відкривають; ↑ ↓ Home End рухають; Enter вибирає; Esc закриває; фокус повертається на тригер;
  набір літер переходить до варіанта.
- Значення йде у форму через `<input type="hidden" name=…>` усередині тієї ж форми — імена `therapist`, `client_id`
  не змінюються. Плейсхолдер «Choose a client» (колір `muted`).

### 4.2 DatePicker

- Тригер як у Select, значення `YYYY-MM-DD` (Geist Mono), іконка календаря праворуч.
- Діалог (`role="dialog"`, `aria-label="Choose a day"`): заголовок «October 2026» з кнопками попереднього / наступного
  місяця (44×44), тиждень з понеділка (Mo … Su), сітка днів (`role="grid"`), дні інших місяців — `muted`;
  «сьогодні» (у часовому поясі America/Los_Angeles) — тонке кільце `border-strong`; вибраний день — фон `btn`, текст `on-btn`.
  Внизу — кнопки «Today» і «Close» (ghost).
- Клавіатура: стрілки по днях, PageUp / PageDown — місяць, Enter вибирає, Esc закриває з поверненням фокуса.
- Значення — `<input type="hidden" name="date">` у GET-формі `/slots`.

## 5. Сторінки

- **`/slots`**:
  - **Картка «Therapist and day»** (іконка фільтра): Select Therapist, DatePicker Day і кнопка Show (primary).
    Це та сама GET-форма.
  - **Картка «<Терапевт> — <дата>»** (іконка календаря): усередині смуга `subtle` з Select «Client to hold a slot for»
    (наявна форма `HoldSlotForm`), під нею `ActionMessage`, далі `SlotTable`.
  - **`SlotTable`**: колонки Time · Status · Client · Held until · дія. Порожні клітинки — «—» кольору `muted`.
    Кнопка «Hold HH:MM» — primary, «Confirm HH:MM» — secondary. Обидві й далі надсилають форми через атрибут `form`
    з `name="slot_start"` / `name="hold_id"`. Рядок 60px, роздільник `border`. На телефоні (≤ 720px) рядок стає блоком:
    час зліва, праворуч статус, клієнт, «Held until …», кнопка.
  - **Картка «Expired holds»** (іконка історії): опис `muted` і та сама таблиця з бейджем Expired.
- **`/my-schedule`**: картка на кожен день (заголовок — дата), всередині `SlotTable` без колонки дії; той самий StatusBadge.
- **`/clients`**: картка «New client» (Field + Input для Name і Email, кнопка Create client — primary, `ActionMessage`);
  картка «All clients» — таблиця Name · Email.
- **`/`**: картка з парами «підпис / значення» (Email, Роль) — сітка у 2 колонки.
- **`/login`**: без бічної панелі; одна картка 400px по центру сторінки, ті самі Field / Input / Button.

## 6. Що не можна змінювати

- Тексти PM (статуси, повідомлення, «No free slots on this day.» тощо) і наявні тексти UI.
- Імена полів: `full_name`, `email`, `client_id`, `therapist_id`, `slot_start`, `hold_id`, GET-параметри `therapist`, `date`.
- `data-testid`: `user-email`, `user-role`, `client-list`, `slot-list`, `no-free-slots`, `expired-holds`
  (якщо список стає таблицею — атрибут переходить на `<table>` або `<tbody>`).
- `useActionState`, server actions у `actions.ts`, `requirements/`, `openspec/specs/`, міграції.
- Нові npm-залежності — лише з окремого погодження.

## 7. Доступність (WCAG 2.1 AA)

- Контраст тексту ≥ 4.5:1, меж контролів і focus ≥ 3:1 — значення в таблиці 2.1, в обох темах.
- Focus ring: `outline: 2px solid var(--focus); outline-offset: 2px` на всіх інтерактивних елементах; `outline-none` без заміни заборонено.
- Цілі натискання ≥ 44×44 px.
- Анімація спінера й пульс скелетона вимикаються при `prefers-reduced-motion: reduce`.

## 8. Перевірка після впровадження

`npm run lint` (0 warnings), `npm run typecheck`, `npm test`, `npm run build`, `npm run ac:coverage`.
Плюс ручна перевірка: світла й темна теми, ширина 390px без горизонтальної прокрутки, повний прохід клавіатурою
(Tab, Select, DatePicker, кнопки Hold / Confirm).
