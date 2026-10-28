# Дизайн-система: Practice scheduling — «Airy glass»

- **Джерело:** артефакт Claude Design (тип Design System) — <https://claude.ai/artifact/9rhbBZwwXX39wiX9sPsCUn>;
  з нього 20.10 взято нормативний текст і макет `docs/design/design-preview.html` (варіант 6 «Airy glass»). У цьому
  файлі текст перебудовано за шаблоном курсу, токени названо семантично (shadcn/ui), контраст перераховано.
- **Вхід від PM:** розділ «Вигляд і тон» у `requirements/product.md` (знімок 2026-10-25).
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (власні, на токенах, без shadcn/ui і без
  нових npm-залежностей); перевірка — `npm run check:design`. Візуальний еталон — `docs/design/design-preview.html`
  (статичний макет); якщо макет і цей файл розходяться, правий цей файл.

## 1. Огляд

Внутрішній застосунок однієї практики для адміністраторів, планувальників і терапевтів. Ним користуються щодня на
робочому столі між сеансами й дзвінками, іноді з телефона (від 390px). Тон за «Вигляд і тон» PM: спокійний, стриманий,
охайний; інтерфейс не відволікає. Світлий повітряний фон (блакитно-лавандовий градієнт із мʼякими плямами), темний
текст, «скляні» панелі з великим радіусом. Один приглушений акцент для головних дій — темно-синя пігулка
(`primary`). Червоний (`destructive`) — лише для помилок. Щільність середня: розклад і списки компактні, форми просторі.
Чого уникаємо: яскравих кольорів, декоративних елементів, що несуть зміст, статусу лише кольором, брендингу клієнта.

Принципи:

- Одна основна дія на картку чи екран — `Button` `primary`. Решта — `secondary` (біла з синьою межею) або `glass`.
- Статус ніколи не передається лише кольором: **текст бейджа + іконка + фактура картки** (розділ 2, «Статуси»).
- Плями фону й штриховка — декор, змісту самі не несуть.
- Тексти PM, імена полів форм, `data-testid`, ролі `alert` / `status` і server actions дизайн не змінює.

## 2. Кольори

Семантичні токени з іменами shadcn/ui плюс токени домену. Значення — у `src/app/globals.css` (`:root` — світла,
`.dark` — темна), класи Tailwind — через `@theme inline`. У сторінках і компонентах — лише утиліти з колонки «Клас»,
ніколи hex, `bg-[#…]` чи сирі палітри (`zinc-500`, `bg-white`).

**Тема.** За замовчуванням світла, незалежно від ОС. Темну вмикає перемикач у бічній смузі: клас `.dark` на `<html>`,
варіант Tailwind `dark:` відповідає саме йому (`@custom-variant dark`). Вибір зберігається в cookie `theme` на рік
(`src/lib/theme.ts`); кореневий layout одразу віддає сторінку в потрібній темі, без спалаху.

| Токен | Для чого | Світла | Темна | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки (основа градієнта) й основний текст | `#eef2fd` / `#141a38` | `#0b1024` / `#eef1ff` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | скляні панелі, кнопки смуги, плашка акаунта | `rgba(255,255,255,.66)` / `foreground` | `rgba(255,255,255,.06)` / `foreground` | `bg-card`, `text-card-foreground` |
| `card-border` | межа 1px скляних елементів | `rgba(255,255,255,.9)` | `rgba(255,255,255,.12)` | `border-card-border` |
| `popover` / `popover-foreground` | спливаюча панель Select | `rgba(255,255,255,.85)` / `foreground` | `rgba(255,255,255,.10)` / `foreground` | `bg-popover` |
| `primary` / `primary-foreground` | основна дія (одна на картку), активний пункт смуги, вибраний день | `#1b2658` / `#ffffff` | `#c9d6ff` / `#0d1330` | `bg-primary`, `text-primary-foreground` |
| `secondary` / `secondary-foreground` | другорядна дія («Confirm») | `rgba(255,255,255,.85)` / `#1b2658` | `rgba(255,255,255,.10)` / `#c9d6ff` | `bg-secondary`, `text-secondary-foreground` |
| `muted` / `muted-foreground` | приглушене тло; підписи, години, допоміжний текст | `rgba(255,255,255,.85)` / `#535b7a` | `rgba(255,255,255,.10)` / `#a5acc8` | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | поля, наведення, вибраний рядок, картка Confirmed | `rgba(255,255,255,.85)` / `foreground` | `rgba(255,255,255,.10)` / `foreground` | `bg-accent`, `hover:bg-accent` |
| `destructive` / `destructive-surface` | текст і межа помилки / тло повідомлення про помилку | `#a3283a` / `#fde8ec` | `#ffadb9` / `#3a1820` | `text-destructive`, `bg-destructive-surface` |
| `success` / `success-surface` | повідомлення про успіх | `#1d6942` / `#e0f4e7` | `#a3e3bd` / `#14301f` | `text-success`, `bg-success-surface` |
| `border` | роздільники годин і колонок у сітці | `rgba(20,26,56,.08)` | `rgba(238,241,255,.10)` | `border-border` |
| `input` | межа поля, пунктир картки Free, рамка чекбокса | `#7d86a3` | `#8a93b5` | `border-input` |
| `ring` | кільце фокусу | `#2a5bd7` | `#8fb0ff` | `outline-ring`, глобальний `:focus-visible` |
| `now` / `now-foreground` | лінія й пігулка «зараз», крапка «сьогодні» в календарі | `#2a5bd7` / `#ffffff` | `#8fb0ff` / `#0d1330` | `bg-now`, `text-now-foreground` |
| `status-free` / `-foreground` | бейдж «Free» | `#e0f4e7` / `#1d6942` | `#14301f` / `#a3e3bd` | `bg-status-free`, `text-status-free-foreground` |
| `status-held` / `-foreground` | бейдж «Held» | `#fbf0cf` / `#76520a` | `#2e260d` / `#f0d488` | `bg-status-held`, `text-status-held-foreground` |
| `status-confirmed` / `-foreground` | бейдж «Confirmed» | `#e4e9ff` / `#2a3c9a` | `#1e2650` / `#bcc8ff` | `bg-status-confirmed`, `text-status-confirmed-foreground` |
| `status-expired` / `-foreground` | бейдж «Expired» і «Past» | `#eaedf3` / `#4f566b` | `#262b3d` / `#c3c7d4` | `bg-status-expired`, `text-status-expired-foreground` |

Лише в `globals.css` (без класів Tailwind, у компонентних класах `.glass`, `.slot-*`, `.avatar`):

- фон сторінки: `bg-1` → `bg-2` (лінійний градієнт 160°) і плями `blob-a` / `blob-b` / `blob-c`;
- фактури карток слотів: `hatch` (штриховка Held), `free-card` (майже прозоре тло Free);
- коло з ініціалами: `avatar-from` → `avatar-to`.

**Знак застосунку** — не токени, а файл `public/brand/practice-scheduling-icon.svg` (хрест із серцем і пульсом, власні
кольори SVG, однакові в обох темах). Той самий файл — `src/app/icon.svg` (вкладка браузера), з нього ж
`src/app/favicon.ico` 48×48. У сторінках — лише `BrandMark` (`src/components/brand-mark.tsx`): декоративний
(`alt=""`, `aria-hidden`), назва «Practice scheduling» — текстом поруч.

**Статуси й фактура карток слотів** (статус ніколи не лише кольором):

| Статус | Бейдж | Фактура картки (`SlotCard`) |
|---|---|---|
| Free | текст «Free» + порожнє коло | пунктир `input` 1.5px, тло `free-card` |
| Held | текст «Held» + годинник | `accent` + діагональна штриховка 135° (`hatch`, смуга 2px кожні 12px) |
| Confirmed | текст «Confirmed» + галочка | суцільне `accent` з тінню |
| Expired | текст «Expired» + перекреслене коло | приглушене `card` |
| Past | текст «Past» + коло зі стрілкою назад, кольори `status-expired` | приглушене `card`, як «Expired» |

### Контраст

WCAG 2.1, найгірший випадок: напівпрозорі поверхні (`card`, `accent`, `secondary`) пораховано поверх кожного з
кольорів фону (`bg-1`, `bg-2` і трьох плям) і взято найменше значення. Бейдж «Past» не бере `muted`: у темній темі
`muted-foreground` на `muted` дає лише 4.37 (поверх `card` — 3.68), тому він на непрозорих токенах `status-expired`.

| Пара | Світла | Темна | Норма |
|---|---|---|---|
| `foreground` на `background` | 12.37 | 11.79 | ≥ 4.5 |
| `foreground` на `card` | 15.32 | 9.89 | ≥ 4.5 |
| `muted-foreground` на `background` | 4.86 | 5.90 | ≥ 4.5 |
| `muted-foreground` на `card` | 6.01 | 4.95 | ≥ 4.5 |
| `primary-foreground` на `primary` | 14.34 | 12.62 | ≥ 4.5 |
| `secondary-foreground` на `secondary` | 13.70 | 6.81 | ≥ 4.5 |
| `destructive` на `card` | 6.47 | 6.32 | ≥ 4.5 |
| `destructive` на `destructive-surface` | 6.14 | 8.96 | ≥ 4.5 |
| `success` на `success-surface` | 5.80 | 9.70 | ≥ 4.5 |
| `status-free-foreground` на `status-free` | 5.80 | 9.70 | ≥ 4.5 |
| `status-held-foreground` на `status-held` | 6.19 | 10.35 | ≥ 4.5 |
| `status-confirmed-foreground` на `status-confirmed` | 7.87 | 8.87 | ≥ 4.5 |
| `status-expired-foreground` на `status-expired` (і бейдж «Past») | 6.23 | 8.32 | ≥ 4.5 |
| `now-foreground` на `now` | 5.87 | 8.52 | ≥ 4.5 |
| `input` на `card` | 3.25 | 3.67 | ≥ 3 |
| `input` на `accent` (межа поля на його тлі) | 3.45 | 3.24 | ≥ 3 |
| `ring` на `background` | 4.27 | 6.21 | ≥ 3 |
| `ring` на `card` | 5.29 | 5.21 | ≥ 3 |

## 3. Типографіка

Шрифт — **Manrope** через `next/font/google` (`--font-sans`), ваги 400–700. Глобально `font-variant-numeric:
tabular-nums` — час і дати вирівнюються без моноширинного шрифту. Мова інтерфейсу — лише англійська (заголовки,
кнопки, помилки, `aria-label`, `<title>`, `lang="en"`); дати й час — `YYYY-MM-DD HH:MM`.

| Роль | Клас | Де |
|---|---|---|
| Заголовок сторінки | `text-[44px] leading-[52px] font-normal tracking-[-0.025em]` (34/40 до 760px) | один на сторінку, `PageHeader` |
| Заголовок панелі | `text-[22px] leading-7 font-medium` | `Panel` |
| Імʼя в картці слота | `text-sm leading-5 font-semibold` | `SlotCard` |
| Основний текст | `text-sm` (14/20) | усюди |
| Підпис поля | `text-[13px] leading-[18px] font-semibold` | `Label` |
| Підпис, допоміжний текст | `text-xs text-muted-foreground` або `text-muted-foreground` | описи панелей, години |
| Бейдж | `text-xs font-bold` | `StatusBadge` |

## 4. Відступи й радіуси

- Каркас: бічна смуга 96px + контент; до 760px смуга — плаваюча пігулка внизу, контенту — нижній відступ 96px. Без
  горизонтальної прокрутки сторінки (широка сітка прокручується всередині своєї панелі).
- Відступи: панель `p-[26px]` (`p-5` до 760px); між панелями `gap-6`; поля у формі `gap-4`; висота години в сітці ≥ 104px.
- Радіуси (`@theme`): `rounded-sm` 10px, `rounded-md` 14px (рядки списків), `rounded-lg` 24px (картки слотів,
  порожній стан), `rounded-xl` 28px (панелі), `rounded-full` (кнопки, поля, бейджі, повідомлення).
- Тіні: `shadow-glass` (панелі), `shadow-pop` (спливаючі панелі), `shadow-primary` (основна кнопка).
- Цілі натискання ≥ 44×44px.

## 5. Компоненти й варіанти

Примітиви — лише з `@/components/ui`. Складені компоненти застосунку (`AppShell`, `Calendar`, `ChoiceList`, `DayGrid`,
`SlotCard`, `EmptyState`, `ActionMessage`) лежать у `src/components/` і будуються на цих примітивах і токенах.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` (`ui/button`) | `primary`, `secondary`, `glass`; `pending` | `primary` — одна основна дія на картку чи екран («Hold», «Sign in», «Create client»); `secondary` — «Confirm»; `glass` — нейтральні дії. `pending` — спінер, `aria-busy`, `disabled` |
| `SubmitButton` (`ui/submit-button`) | як `Button` | форми з server action без `useActionState` («Sign in», «Sign out»): `pending` з `useFormStatus` |
| `Input` (`ui/input`) | — | пігулка 48px, `bg-accent`, межа `input`; `aria-invalid` → межа `destructive` |
| `Label` (`ui/label`) | — | у кожного поля, з `htmlFor`; placeholder — не замість підпису |
| `Field` (`ui/field`) | `error?` | `Label` + контрол + помилка поля `text-destructive` під ним |
| `Select` (`ui/select`) | — | власний select-only combobox (WAI-ARIA): Enter / Space / ↓ відкривають, ↑ ↓ Home End, Enter вибирає, Esc закриває й повертає фокус; значення — прихований `<input>` |
| `Panel` (`ui/panel`) | `title?`, `description?`, `actions?` | скляна картка `<section aria-labelledby>`; аналог `Card` |
| `StatusBadge` (`ui/badge`) | `Free`, `Held`, `Confirmed`, `Expired`, `Past` | статус — завжди текст PM + іконка, не лише колір |
| `Avatar` (`ui/avatar`) | розмір через `className` | коло з ініціалами, `aria-hidden` (імʼя завжди поруч текстом) |
| `Skeleton` (`ui/skeleton`) | `SkeletonField`, `SkeletonRows` | стан завантаження в `loading.tsx`: ті самі панелі, пульсуючі блоки `accent` |

Новий примітив — у `src/components/ui/` на токенах з розділу 2; сторінка не має власних `<button>` чи `<input>` зі
стилями (приховані `<input type="hidden">` форм — можна).

## 6. Стани

| Стан | Як виглядає | Приклад тексту |
|---|---|---|
| Порожній список чи день | `EmptyState`: пунктирна рамка `rounded-lg`, іконка в скляному колі, текст 600, `role="status"` | «No free slots on this day.» (AC-HOLD-18, AC-HOLD-24) |
| Помилка дії | `ActionMessage` (`role="alert"`): пігулка `bg-destructive-surface text-destructive` з іконкою над чи під формою; введене лишається у формі | «This slot is no longer available.» (AC-HOLD-03) |
| Успіх дії | `ActionMessage` (`role="status"`): пігулка `bg-success-surface text-success` | «Slot held for 24 hours.» |
| Відмова в доступі | панель з поясненням, без даних | текст — дослівно з AC відмови |
| Завантаження розділу | `loading.tsx` зі `Skeleton` і «Loading…» у постійній `role="status"`-області AppShell; іконка пункту смуги — спінер, поки перехід чекає сервера | «Loading…» |
| Дія виконується | `Button` `pending`: спінер, `aria-busy`, `disabled` | «Holding…» |
| Вимкнена дія | `disabled` + курсор `not-allowed`; причина — текстом поруч | — |

## 7. Доступність — мінімум

- `Label` у кожного поля; помилка поля — під ним; `aria-invalid` на невалідному полі.
- Видимий фокус: глобальний `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`; Tab проходить
  форму по порядку; смуга, `ChoiceList`, `Calendar` (roving tabindex, стрілки, PageUp / PageDown) і `Select` — з клавіатури.
- Контраст — таблиця в розділі 2, в обох темах.
- Статус ніколи не лише кольором — текст + іконка + фактура.
- Кнопки смуги без видимого тексту — `aria-label` і видима підказка на hover і focus.
- Спершу семантичний HTML (`<button>`, `<table>` / `role="table"`, `<label>`); `aria-*` — там, де HTML бракує.
- Спінер і пульс скелетона вимикаються при `prefers-reduced-motion: reduce`.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground` | `bg-zinc-900 text-white`, `bg-[#1b2658]`, `style={{ color: "#…" }}` |
| `Button` з потрібним варіантом з `@/components/ui/button` | власний `<button className="…">` у сторінці |
| статус через `StatusBadge` (текст + іконка) | статус лише кольором рамки чи фону |
| новий токен через розділ 9 | колір «лише для цієї сторінки» |
| `text-muted-foreground` для допоміжного тексту | `opacity-60` на основному тексті замість токена |
| `outline-ring` / глобальний `:focus-visible` | `outline-none` без заміни |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, клас; пару — в таблицю «Контраст».
2. `src/app/globals.css`: `--<назва>` у `:root` і в `.dark`.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → зʼявляються класи `bg-<назва>`, `text-<назва>`, `border-<назва>`.
4. `npm run check:design` і знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза
  `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен виняток — з реальною причиною (зараз їх немає).
- Візуально: знімки `/login` і `/slots` у світлій і темній темі в `docs/img/design/`: `*-ws6.png` — до дизайн-системи
  (стан WS6, коміт `c19c470`), `*-before.png` і `*-after.png` — до й після переходу на семантичні токени й
  `src/components/ui` (вигляд не змінився). Плюс ширина 390px без горизонтальної прокрутки, Tab по формах, контраст.
