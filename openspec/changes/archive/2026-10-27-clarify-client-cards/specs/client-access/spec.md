## MODIFIED Requirements

### Requirement: Список своїх клієнтів терапевта

WHEN терапевт відкриває список своїх клієнтів, the system SHALL показати картки лише тих клієнтів, у яких із ним є утримання зі статусом «Held», слот якого ще не почався, або сеанс зі статусом «Confirmed», зокрема вже минулий, з усіма даними анкети, а якщо таких клієнтів немає — лише повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.».

#### Scenario: AC-CARD-04 Терапевт бачить лише своїх клієнтів

- **GIVEN** зараз 2026-11-02 12:00, client6 має утримання зі статусом «Held» у therapist1 на 2026-11-05 о 10:00, client7 — сеанс зі статусом «Confirmed» у therapist1 2026-11-04 о 10:00, а client9 — утримання зі статусом «Held» у therapist2 на 2026-11-05 об 11:00
- **WHEN** therapist1 відкриває список своїх клієнтів
- **THEN** він бачить картки client6 і client7 з усіма даними анкети (для client7 — з даними опікуна)
- **AND** не бачить client9

#### Scenario: AC-CARD-09 Терапевт без клієнтів

- **GIVEN** therapist2 не має жодного утримання зі статусом «Held» і жодного сеансу зі статусом «Confirmed»
- **WHEN** therapist2 відкриває список своїх клієнтів
- **THEN** він бачить повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.»
- **AND** жодної картки

#### Scenario: AC-CARD-14 Утримання «Held» робить клієнта своїм лише до початку слоту

- **GIVEN** слот therapist1 2026-11-03 о 10:00 утримано за client6 2026-11-02 о 14:30 зі статусом «Held», client7 мав сеанс зі статусом «Confirmed» у therapist1 2026-11-02 о 10:00, і інших утримань чи сеансів client6 і client7 з therapist1 немає
- **WHEN** therapist1 відкриває список своїх клієнтів 2026-11-03 о 09:59, а потім о 10:00 або пізніше
- **THEN** о 09:59 він бачить картки client6 і client7
- **AND** з 10:00 — лише картку client7
- **AND** за прямим посиланням на картку client6 therapist1 бачить повідомлення «You don't have access to this client.» і жодних даних client6

### Requirement: Картка чужого клієнта

IF терапевт відкриває картку клієнта, у якого з ним немає утримання зі статусом «Held», слот якого ще не почався, чи сеансу зі статусом «Confirmed», THEN the system SHALL показати повідомлення «You don't have access to this client.», не показувати жодних даних цього клієнта й не змінювати його картку.

#### Scenario: AC-CARD-05 Картка клієнта іншого терапевта

- **GIVEN** client9 — свій клієнт лише для therapist2
- **WHEN** therapist1 відкриває картку client9 за прямим посиланням
- **THEN** therapist1 бачить повідомлення «You don't have access to this client.»
- **AND** жодних даних client9 не показано
- **AND** картка client9 не змінилася

#### Scenario: AC-CARD-08 Клієнт після прострочення утримання

- **GIVEN** утримання client6 у therapist1 має статус «Expired», і інших утримань чи сеансів client6 з therapist1 немає
- **WHEN** therapist1 відкриває список своїх клієнтів, а потім картку client6 за прямим посиланням
- **THEN** client6 у списку немає
- **AND** за посиланням therapist1 бачить повідомлення «You don't have access to this client.» і жодних даних client6

### Requirement: Терапевт не створює картки

IF користувач з роллю `therapist` відкриває форму нової картки клієнта, зокрема за прямим посиланням, або пробує створити картку в обхід цієї форми, THEN the system SHALL не показувати форму, не створювати картку, одразу показати повідомлення «Only schedulers and admins can create client cards.» і не змінювати кількість карток клієнтів.

#### Scenario: AC-CARD-06 Терапевт пробує створити картку

- **GIVEN** therapist1 увійшов у застосунок
- **WHEN** він відкриває форму нової картки клієнта за прямим посиланням
- **THEN** форму не показано
- **AND** therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.»
- **AND** кількість карток клієнтів не змінилася

### Requirement: Усі картки для планувальника й адміністратора

WHEN планувальник або адміністратор відкриває список клієнтів, the system SHALL показати картки всіх клієнтів, а в картці дитини — дані опікуна, а якщо карток ще немає — замість списку повідомлення «No clients yet. Create a client card from an intake form.» і доступну, як завжди, форму нової картки.

#### Scenario: AC-CARD-10 Планувальник і адміністратор бачать усі картки

- **GIVEN** існують картки client6, client7 і client9
- **WHEN** scheduler2 або admin1 відкриває список клієнтів
- **THEN** кожен із них бачить усі три картки
- **AND** у картці client7 — дані опікуна

#### Scenario: AC-CARD-15 Порожній список клієнтів для планувальника й адміністратора

- **GIVEN** у практиці ще немає жодної картки клієнта
- **WHEN** scheduler1 або admin1 відкриває список клієнтів
- **THEN** замість списку він бачить повідомлення «No clients yet. Create a client card from an intake form.»
- **AND** форма нової картки доступна, як завжди

### Requirement: Користувач без ролі

IF користувач, який увійшов, ще не має ролі, THEN the system SHALL показувати йому на будь-якій сторінці застосунку лише повідомлення «Your account has no access yet. Contact an administrator.» і дію «Sign out», без жодних даних клієнтів, і не змінювати жодної картки.

#### Scenario: AC-CARD-11 Користувач без ролі

- **GIVEN** користувач newuser1@example.test увійшов, але не має ролі
- **WHEN** він відкриває застосунок або картку client6 за прямим посиланням
- **THEN** він бачить лише повідомлення «Your account has no access yet. Contact an administrator.» і дію «Sign out»
- **AND** жодних даних клієнтів не показано
- **AND** жодна картка не змінилася

## ADDED Requirements

### Requirement: Картка, якої не існує

IF користувач відкриває посилання на картку клієнта, якої не існує, THEN the system SHALL показати планувальнику й адміністратору повідомлення «This client card doesn't exist.», терапевту — «You don't have access to this client.», і не показувати жодних даних клієнтів.

#### Scenario: AC-CARD-16 Посилання на картку, якої не існує

- **GIVEN** картки клієнта, на яку веде посилання, не існує
- **WHEN** scheduler1, а потім therapist1 відкриває це посилання
- **THEN** scheduler1 бачить повідомлення «This client card doesn't exist.»
- **AND** therapist1 — «You don't have access to this client.»
- **AND** жоден із них не бачить жодних даних клієнтів
