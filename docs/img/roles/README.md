# Знімки за ролями на проді

- **Де й коли:** https://therapy-scheduling-two.vercel.app, 2026-10-27 вечір за часом практики (America/Los_Angeles),
  1440×900, світла тема.
- **Акаунти:** PM-акаунти з `supabase/demo-users.json` (`npm run users:demo`); пароль — лише в чаті з PM.
- **Горизонтальна прокрутка:** на всіх сторінках немає (`scrollWidth` = ширина вікна).
- **Дані:** лише синтетичні. Знімки, де були несинтетичні картки клієнтів, не потрапили сюди. Ці картки видалено
  міграцією `20261027212409_remove_non_synthetic_clients.sql` (PR #29).
- **Чого ще немає:** знімків «All clients», картки клієнта й розкладу терапевта з утриманнями. На проді поки немає
  синтетичних клієнтів і утримань, тож ці знімки додамо після них.

| Файл | Роль | Сторінка | Що видно | AC |
|---|---|---|---|---|
| `therapist-my-schedule.png` | pm-therapist | `/my-schedule` | тиждень пн–нд 2026-10-26 – 11-01, «Previous / This / Next week»; у pm-therapist немає доступності — «No slots on this day.» | AC-HOLD-30 |
| `therapist-slots.png` | pm-therapist | `/slots` | «Only schedulers and admins can view this page.» | AC-HOLD-44 |
| `therapist-holds.png` | pm-therapist | `/holds` | «Only schedulers and admins can view this page.» | AC-HOLD-44 |
| `therapist-clients-new.png` | pm-therapist | `/clients/new` | «Only schedulers and admins can create client cards.» | AC-CARD-06 |
| `therapist-clients.png` | pm-therapist | `/clients` | «My clients» — «No clients yet. Clients appear here when a scheduler holds a slot with you.» | AC-CARD-04 |
| `scheduler-slots.png` | pm-scheduler | `/slots` | три терапевти поруч; минулі години — «Past»; у PM Therapist немає слотів — «No free slots on this day.» | AC-HOLD-24, AC-HOLD-32 |
| `scheduler-holds.png` | pm-scheduler | `/holds` | «Upcoming holds» — «No holds.» (порожній стан) | — |
| `scheduler-clients-new.png` | pm-scheduler | `/clients/new` | форма анкети клієнта | AC-CARD-01 |
| `admin-home.png` | pm-admin | `/` | акаунт: email і роль admin | — |
| `admin-holds.png` | pm-admin | `/holds` | «Upcoming holds» — «No holds.» (порожній стан) | — |
| `admin-clients.png` | pm-admin | `/clients` | «All clients» — «No clients yet. Create a client card from an intake form.» (після PR #29) | AC-CARD-10 |
