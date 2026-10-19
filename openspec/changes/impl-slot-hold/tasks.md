# Tasks

Вертикальні задачі: кожна — міграція/RLS + доменна функція + server action/сторінка + тест, один PR «Реалізація»
(гілка `task/<коротко>`). Кожна закінчується рядком «Done when» з AC ID; перевірка — `npm test`, `npm run ac:coverage`.

## 1. Ролі й картка клієнта

- [x] 1.1 Міграція: ролі `admin`/`scheduler`/`therapist` (дані → default → constraint), хелпер `private.is_staff`,
  таблиця `clients` з унікальним `lower(email)`, RLS і GRANT; `supabase/demo-users.json` (admin, scheduler1, scheduler2,
  therapist1, therapist2); `validateClient`; сторінка `/clients` і `createClientAction`; тести.
  Done when: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16 — тести зелені, після merge `db-deploy` і `users:demo`
  планувальник створює клієнта на проді.

## 2. Слоти дня й прострочення

- [ ] 2.1 Міграція: `therapist_availability` (сид для therapist1/therapist2), `holds` з RLS (select за роллю);
  `holdStatus`, `buildDaySlots`, `formatLA`; сторінка `/slots` (терапевт, день, статуси, «Held until», «No free slots on
  this day.»); тести.
  Done when: AC-HOLD-01, AC-HOLD-05, AC-HOLD-06, AC-HOLD-18.

## 3. Утримання слоту

- [ ] 3.1 Міграція: функція `hold_slot` (роль, advisory lock, початок слоту, активне утримання, insert); мапінг кодів
  помилок; `holdSlotAction` і кнопка Hold на `/slots`; тести.
  Done when: AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-07, AC-HOLD-08, AC-HOLD-17.

## 4. Підтвердження утримання

- [ ] 4.1 Міграція: функція `confirm_hold`; `confirmHoldAction` і кнопка Confirm на `/slots`; тести.
  Done when: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19.

## 5. Розклад терапевта

- [ ] 5.1 Політика select `holds`/`clients` для терапевта (лише власні); сторінка `/my-schedule` на 7 днів; тест;
  запис екрана 1–2 хв на прод-URL у PR; `npx openspec archive impl-slot-hold -y` до merge.
  Done when: AC-HOLD-09; `npm run ac:coverage` — OK, усі AC зрізу «реалізовано» або «відкладено (причина)».
