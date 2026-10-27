## MODIFIED Requirements

### Requirement: Терапевт не створює картки

IF користувач з роллю `therapist` пробує створити картку клієнта, зокрема за прямим посиланням на форму нової картки, THEN the system SHALL не створювати картку, показати повідомлення «Only schedulers and admins can create client cards.» і не змінювати кількість карток клієнтів.

#### Scenario: AC-CARD-06 Терапевт пробує створити картку

- **GIVEN** therapist1 увійшов у застосунок
- **WHEN** він відкриває форму нової картки клієнта за прямим посиланням і пробує створити картку
- **THEN** картку не створено
- **AND** therapist1 бачить повідомлення «Only schedulers and admins can create client cards.»
- **AND** кількість карток клієнтів не змінилася
