# Пропозиція: речення вимоги AC-CARD-06 без рішення про показ форми

## Why

Речення вимоги «Терапевт не створює картки» в `openspec/specs/client-access/spec.md` казало «зокрема з форми нової
картки, відкритої за прямим посиланням» і так наперед вирішувало, що терапевт бачить форму. Саме це ще відкрите
питання до PM — Q5, Sofiia-pm/therapy-scheduling-spec#24 (вимога `requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md`,
<https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/19>, знімок 2026-10-25). Зауваження CodeRabbit у PR
«Специфікація» зрізу 2: HryhoriiHaponiukQuitCode/therapy-scheduling#18
(<https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling/pull/18#discussion_r4372102048>). Архівна дельта
`2026-10-25-add-client-cards` лишається історією зі старим реченням; чинне — після цієї зміни.

## What Changes

- **MODIFIED** «Терапевт не створює картки»: речення вимоги описує спробу створення за прямим посиланням на форму нової
  картки (словами сценарію PM), не вирішуючи, чи форму показано. Сценарій AC-CARD-06 — дослівно текст PM, без змін.

## Capabilities

### New Capabilities

—

### Modified Capabilities

- `client-access`: лише речення вимоги AC-CARD-06.

## Users & roles

| Роль | Сутність | Що змінюється |
|---|---|---|
| `therapist` | Картка клієнта | без змін: не створює (—); формулювання не наперед вирішує показ форми |

## Non-goals

- Відповідь на Q5 і зміна сценарію AC-CARD-06 — після відповіді PM, окремою зміною.

## Assumptions

- Без змін щодо зміни `add-client-cards`.

## Open questions

- Q5 — Sofiia-pm/therapy-scheduling-spec#24: форма чи одразу відмова, коли терапевт відкриває створення картки за
  прямим посиланням (рекомендація розробника — одразу відмова; до відповіді PM не реалізуємо як правило).
