## ADDED Requirements

### Requirement: Картка клієнта з анкети

WHEN планувальник або адміністратор створює картку клієнта з типом «Adult» або «Child», ім'ям, датою народження не пізніше за сьогодні й мовою сеансів «English» або «Spanish», а також email клієнта для типу «Adult» або іменем та email опікуна для типу «Child», the system SHALL створити картку, показати в ній усі ці дані й дозволити вибрати цього клієнта під час утримання слоту, для дитини — з email опікуна.

#### Scenario: AC-CARD-01 Картка дорослого клієнта

- **GIVEN** клієнта з email client6@example.test ще немає
- **WHEN** scheduler1 створює картку з типом «Adult», ім'ям «Client Six», email client6@example.test, датою народження 1990-05-14 і мовою сеансів «English»
- **THEN** картку створено, і в ній показано всі ці дані
- **AND** client6 можна вибрати під час утримання слоту

#### Scenario: AC-CARD-02 Картка дитини з опікуном

- **GIVEN** опікуна з email guardian7@example.test ще не вказано в жодній картці
- **WHEN** scheduler1 створює картку з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02, мовою сеансів «Spanish», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** картку створено, і в ній показано дані дитини й опікуна
- **AND** під час утримання слоту біля client7 показано email опікуна

### Requirement: Дані опікуна дитини

IF у картці з типом «Child» ім'я опікуна порожнє або email опікуна порожній чи некоректний, THEN the system SHALL не створювати картку, показати повідомлення «Enter the guardian's name and a valid email.» і залишити всі введені дані у формі.

#### Scenario: AC-CARD-03 Немає імені чи email опікуна

- **GIVEN** scheduler1 заповнює картку з типом «Child», ім'ям «Client Eight», датою народження 2016-01-10 і мовою «English»
- **WHEN** ім'я або email опікуна залишено порожнім і scheduler1 зберігає картку
- **THEN** картку не створено
- **AND** scheduler1 бачить повідомлення «Enter the guardian's name and a valid email.»
- **AND** усі введені дані лишаються у формі
