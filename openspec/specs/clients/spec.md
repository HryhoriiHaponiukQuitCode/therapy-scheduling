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

IF ім'я клієнта порожнє або email некоректний, THEN the system SHALL не створювати клієнта й показати повідомлення «Enter the client's name and a valid email.».

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

### Requirement: Унікальний email клієнта

IF клієнт із таким email уже існує, THEN the system SHALL не створювати ще одного клієнта й показати повідомлення «A client with this email already exists.».

#### Scenario: AC-HOLD-16 Дублікат email

- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює ще одного клієнта з email client1@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»
