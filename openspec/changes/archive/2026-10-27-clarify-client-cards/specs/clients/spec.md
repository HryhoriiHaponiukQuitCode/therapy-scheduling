## MODIFIED Requirements

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

## ADDED Requirements

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
