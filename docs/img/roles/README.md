# Знімки за ролями на проді

- **Де й коли:** https://therapy-scheduling-two.vercel.app, 2026-10-27 вечір за часом практики (America/Los_Angeles),
  1440×900, світла тема.
- **Акаунти:**
  - PM-акаунти з `supabase/demo-users.json` (`npm run users:demo`); пароль — лише в чаті з PM;
  - розклад і клієнти терапевта — від `therapist1@example.test`, бо в pm-therapist немає годин доступності.
- **Горизонтальна прокрутка:** на всіх сторінках немає (`scrollWidth` = ширина вікна).
- **Дані — лише синтетичні:**
  - несинтетичні картки клієнтів видалено міграцією `20261027212409_remove_non_synthetic_clients.sql` (PR #29); знімків
    із ними тут немає;
  - потім від імені pm-scheduler через інтерфейс проду створено дві картки — Client One (дорослий,
    `client1@example.test`) і Client Seven (дитина, опікун `guardian7@example.test`);
  - і два утримання в Therapist One на 2026-10-28: 10:00 — Client One, підтверджено (сеанс); 11:00 — Client Seven,
    «Held» до 2026-10-28 14:43.
- **Порожні стани:** знімки з порожніми станами (`therapist-clients`, `admin-holds`) зроблено до появи цих даних.

## pm-therapist (без власних клієнтів і доступності)

| Файл | Сторінка | Що видно | AC |
|---|---|---|---|
| `therapist-my-schedule.png` | `/my-schedule` | тиждень пн–нд 2026-10-26 – 11-01, «Previous / This / Next week»; «No slots on this day.» | AC-HOLD-30 |
| `therapist-slots.png` | `/slots` | «Only schedulers and admins can view this page.» | AC-HOLD-44 |
| `therapist-holds.png` | `/holds` | «Only schedulers and admins can view this page.» | AC-HOLD-44 |
| `therapist-clients-new.png` | `/clients/new` | «Only schedulers and admins can create client cards.» | AC-CARD-06 |
| `therapist-clients.png` | `/clients` | «My clients» — «No clients yet. Clients appear here when a scheduler holds a slot with you.» | AC-CARD-04 |

## therapist1 (утримання й сеанс на 2026-10-28)

| Файл | Сторінка | Що видно | AC |
|---|---|---|---|
| `therapist1-my-schedule.png` | `/my-schedule?week=2026-10-26` | середа 2026-10-28: 10:00 Client One «Confirmed», 11:00 Client Seven «Held» до 14:43, решта «Free»; лише ім'я клієнта, без email | AC-HOLD-09, AC-HOLD-40 |
| `therapist1-clients.png` | `/clients` | «My clients»: Client One і Client Seven — клієнти з утриманням чи сеансом у нього | AC-CARD-04 |
| `therapist1-client-card.png` | `/clients/<id>` | картка Client One: тип, дата народження, мова, email — свій клієнт відкривається | AC-CARD-04 |

## pm-scheduler

| Файл | Сторінка | Що видно | AC |
|---|---|---|---|
| `scheduler-slots.png` | `/slots` (2026-10-27) | три терапевти поруч; минулі години — «Past»; у PM Therapist немає слотів — «No free slots on this day.» | AC-HOLD-24, AC-HOLD-32 |
| `scheduler-slots-2026-10-28.png` | `/slots?therapist=…&date=2026-10-28` | Therapist One: 10:00 Client One «Confirmed», 11:00 Client Seven «Held» з кнопкою Confirm, вільні — «Hold» | AC-HOLD-01 |
| `scheduler-holds.png` | `/holds` | «Upcoming holds»: 2026-10-28 11:00 Client Seven, Therapist One, «Held», «Held until 2026-10-28 14:43», Confirm; підтверджений сеанс у списку не показано | AC-HOLD-38 |
| `scheduler-clients.png` | `/clients` | «All clients»: Client One (Adult · email), Client Seven (Child · guardian email) | AC-CARD-10 |
| `scheduler-client-card.png` | `/clients/<id>` | картка Client One з даними анкети | AC-CARD-10 |
| `scheduler-clients-new.png` | `/clients/new` | форма анкети клієнта | AC-CARD-01 |

## pm-admin

| Файл | Сторінка | Що видно | AC |
|---|---|---|---|
| `admin-home.png` | `/` | акаунт: email і роль admin | — |
| `admin-holds.png` | `/holds` | «Upcoming holds» — «No holds.» (до появи утримань) | — |
| `admin-clients.png` | `/clients` | «All clients»: Client One і Client Seven | AC-CARD-10 |
