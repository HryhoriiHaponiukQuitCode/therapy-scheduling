## MODIFIED Requirements

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

## ADDED Requirements

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
