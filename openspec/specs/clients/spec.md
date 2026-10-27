# clients Specification

## Purpose
Картка клієнта практики в першому зрізі — ім'я та унікальний email, щоб планувальник міг вибрати клієнта під час
утримання слоту терапевта.

## Requirements

### Requirement: Створення картки клієнта

WHEN планувальник або адміністратор створює клієнта з непорожнім іменем і коректним email, якого ще немає серед клієнтів, the system SHALL створити картку клієнта, яку можна вибрати під час утримання слоту.

#### Scenario: AC-HOLD-10 Новий клієнт

- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «Client Three» і email client3@example.test
- **THEN** картку клієнта створено
- **AND** його можна вибрати під час утримання слоту

### Requirement: Перевірка імені й email клієнта

IF ім'я клієнта порожнє або складається лише з пробілів, або email після прибирання пробілів на початку й у кінці не має рівно одного «@», непорожньої частини до й після нього чи крапки в частині після «@», або має пробіл усередині, THEN the system SHALL не створювати клієнта й показати повідомлення «Enter the client's name and a valid email.».

#### Scenario: AC-HOLD-11 Порожнє ім'я

- **GIVEN** планувальник створює клієнта
- **WHEN** ім'я залишено порожнім, а email — client3@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-15 Email без знака @

- **GIVEN** планувальник створює клієнта
- **WHEN** ім'я — «Client Three», а email — «client3example.test» (без знака @)
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-39 Інші некоректні email

- **GIVEN** клієнта з таким email ще немає
- **WHEN** планувальник створює клієнта «Client Three» з email «client3@example» (без крапки після «@»), «client3@@example.test» (два «@»), «@example.test» (порожня частина до «@») або «client 3@example.test» (пробіл усередині)
- **THEN** у кожному випадку клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

### Requirement: Унікальний email клієнта

IF клієнт з email, що відрізняється від введеного щонайбільше великими й малими літерами та пробілами на початку й у кінці, уже існує, THEN the system SHALL не створювати ще одного клієнта й показати повідомлення «A client with this email already exists.».

#### Scenario: AC-HOLD-16 Дублікат email

- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює ще одного клієнта з email client1@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»

#### Scenario: AC-HOLD-34 Дублікат email з великими літерами й пробілами

- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює клієнта «Client One» з email « Client1@Example.TEST » (з великими літерами й пробілами на початку та в кінці)
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»

### Requirement: Ім'я та email клієнта без зайвих пробілів

WHEN планувальник або адміністратор створює клієнта, the system SHALL зберегти й показувати його ім'я без пробілів на початку й у кінці, а email — малими літерами без цих пробілів, вважаючи ім'я лише з пробілів порожнім.

#### Scenario: AC-HOLD-35 Email малими літерами без пробілів

- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта «Client Three» з email « Client3@Example.TEST »
- **THEN** клієнта створено
- **AND** у картці клієнта та під час утримання його email показано як client3@example.test

#### Scenario: AC-HOLD-41 Ім'я лише з пробілів і ім'я з пробілами по краях

- **GIVEN** клієнтів з email client4@example.test і client5@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «   » (лише пробіли) і email client5@example.test, а потім клієнта з іменем « Client Four » і email client4@example.test
- **THEN** першого клієнта не створено, і планувальник бачить повідомлення «Enter the client's name and a valid email.»
- **AND** другого створено, і в картці його ім'я показано як «Client Four»

### Requirement: Картка клієнта з анкети

WHEN планувальник або адміністратор створює картку клієнта з типом «Adult» або «Child», ім'ям, датою народження не пізніше за сьогодні й мовою сеансів «English» або «Spanish», а також email клієнта для типу «Adult» або іменем та email опікуна для типу «Child», the system SHALL створити картку, показати в ній усі ці дані й дозволити знайти й вибрати цього клієнта під час утримання слоту, дитину — також за email опікуна, з email опікуна біля її імені.

#### Scenario: AC-CARD-01 Картка дорослого клієнта

- **GIVEN** клієнта з email client6@example.test ще немає
- **WHEN** scheduler1 створює картку з типом «Adult», ім'ям «Client Six», email client6@example.test, датою народження 1990-05-14 і мовою сеансів «English»
- **THEN** картку створено, і в ній показано всі ці дані
- **AND** client6 можна вибрати під час утримання слоту

#### Scenario: AC-CARD-02 Картка дитини з опікуном

- **GIVEN** опікуна з email guardian7@example.test ще не вказано в жодній картці
- **WHEN** scheduler1 створює картку з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02, мовою сеансів «Spanish», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** картку створено, і в ній показано дані дитини й опікуна
- **AND** під час утримання слоту client7 можна знайти за email опікуна guardian7@example.test
- **AND** біля client7 показано email опікуна

### Requirement: Дані опікуна дитини

IF у картці з типом «Child» ім'я опікуна порожнє або email опікуна порожній чи некоректний, THEN the system SHALL не створювати картку, показати повідомлення «Enter the guardian's name and a valid email.» і залишити всі введені дані у формі.

#### Scenario: AC-CARD-03 Немає імені чи email опікуна

- **GIVEN** scheduler1 заповнює картку з типом «Child», ім'ям «Client Eight», датою народження 2016-01-10 і мовою «English»
- **WHEN** ім'я або email опікуна залишено порожнім і scheduler1 зберігає картку
- **THEN** картку не створено
- **AND** scheduler1 бачить повідомлення «Enter the guardian's name and a valid email.»
- **AND** усі введені дані лишаються у формі

### Requirement: Помилки полів картки

IF у картці з типом «Child» ім'я порожнє, дата народження порожня або пізніша за сьогодні чи мову сеансів не вибрано, THEN the system SHALL не створювати картку, одразу показати всі відповідні повідомлення біля своїх полів — «Enter the client's name.», «Enter a date of birth that is not in the future.», «Select a session language.» — і залишити всі введені дані у формі.

#### Scenario: AC-CARD-12 Кілька помилок у картці дитини одразу

- **GIVEN** сьогодні 2026-11-03
- **WHEN** scheduler1 створює картку з типом «Child», порожнім ім'ям, датою народження 2026-11-04, без мови сеансів, з ім'ям опікуна «Guardian Eight» і email опікуна guardian8@example.test
- **THEN** картку не створено
- **AND** scheduler1 одразу бачить три повідомлення біля відповідних полів — «Enter the client's name.», «Enter a date of birth that is not in the future.» і «Select a session language.»
- **AND** усі введені дані лишаються у формі

### Requirement: Дублікат картки дитини

IF уже є картка з типом «Child» з тим самим ім'ям (без урахування великих і малих літер та пробілів на початку й у кінці), датою народження й email опікуна, що й у новій картці дитини, THEN the system SHALL не створювати другу картку, показати повідомлення «A client with these details already exists.» і залишити введені дані у формі.

#### Scenario: AC-CARD-13 Дублікат картки дитини

- **GIVEN** є картка client7 з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02 і email опікуна guardian7@example.test
- **WHEN** scheduler2 створює картку з типом «Child», ім'ям « client seven », датою народження 2015-03-02, мовою сеансів «English», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** другу картку не створено
- **AND** scheduler2 бачить повідомлення «A client with these details already exists.»
- **AND** введені дані лишаються у формі
