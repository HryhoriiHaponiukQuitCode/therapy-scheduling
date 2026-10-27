# Пропозиція: уточнення картки клієнта й утримання за відповідями PM 26.10 (AC-CARD-12…16, AC-HOLD-43/44)

## Why

26.10 PM відповіла на всі питання розробників до зрізу 2 (Sofiia-pm/therapy-scheduling-spec#20–#31, закриті) і
змінила обидві вимоги: «Планувальник заповнює картку клієнта з анкети»
(`requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md`, <https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/19>)
і «Планувальник утримує слот терапевта за клієнтом до підтвердження»
(`requirements/2-planuvalnyk-utrymuie-slot-terapevta.md`, <https://github.com/Sofiia-pm/therapy-scheduling-spec/issues/2>),
знімок 2026-10-27. Додано AC-CARD-12…16, AC-HOLD-43, AC-HOLD-44; змінено AC-CARD-02, 04, 06, 11, AC-HOLD-24,
AC-HOLD-40. Специфікацію треба привести до цього тексту до плану `impl-client-cards`.

## What Changes

- **MODIFIED** «Список своїх клієнтів терапевта» (`client-access`): свій клієнт — утримання «Held», слот якого ще не
  почався, або сеанс «Confirmed», зокрема минулий; AC-CARD-04 — з поточним часом і часом слотів; додано AC-CARD-14
  (Sofiia-pm/therapy-scheduling-spec#25).
- **MODIFIED** «Картка чужого клієнта» (`client-access`): те саме визначення свого клієнта (AC-CARD-05, AC-CARD-08 без
  змін).
- **MODIFIED** «Терапевт не створює картки» (`client-access`): форму не показано, відмова одразу, спробу в обхід форми
  відхилено (AC-CARD-06; Q5, Sofiia-pm/therapy-scheduling-spec#24 — варіант A).
- **MODIFIED** «Усі картки для планувальника й адміністратора» (`client-access`): порожній список — «No clients yet.
  Create a client card from an intake form.» (додано AC-CARD-15; Sofiia-pm/therapy-scheduling-spec#27).
- **MODIFIED** «Користувач без ролі» (`client-access`): повідомлення і дія «Sign out» (AC-CARD-11;
  Sofiia-pm/therapy-scheduling-spec#29).
- **ADDED** «Картка, якої не існує» (`client-access`): планувальник і адміністратор — «This client card doesn't
  exist.», терапевт — «You don't have access to this client.» (AC-CARD-16; Sofiia-pm/therapy-scheduling-spec#28).
- **MODIFIED** «Картка клієнта з анкети» (`clients`): дитину під час утримання знаходять і за email опікуна
  (AC-CARD-02; Sofiia-pm/therapy-scheduling-spec#31).
- **ADDED** «Помилки полів картки» (`clients`): усі повідомлення одразу біля своїх полів, дані лишаються у формі
  (AC-CARD-12; Sofiia-pm/therapy-scheduling-spec#21).
- **ADDED** «Дублікат картки дитини» (`clients`): ім'я без урахування регістру й крайових пробілів, дата народження й
  email опікуна (AC-CARD-13; Q4, Sofiia-pm/therapy-scheduling-spec#23 — варіант B).
- **MODIFIED** «День без жодного слоту» (`slot-holds`): AC-HOLD-24 — субота 2026-11-07.
- **MODIFIED** «Клієнт у розкладі терапевта без email» (`slot-holds`): AC-HOLD-40 без речення про відсутність списку
  клієнтів (Sofiia-pm/therapy-scheduling-spec#30).
- **ADDED** «Прострочене утримання після утримання слоту за іншим клієнтом» (`slot-holds`): обидва записи до початку
  слоту (AC-HOLD-43).
- **ADDED** «Сторінки планувальника недоступні терапевту» (`slot-holds`): «Only schedulers and admins can view this
  page.» (AC-HOLD-44).

## Capabilities

### New Capabilities

—

### Modified Capabilities

- `client-access`: свій клієнт з урахуванням часу слоту, відмова терапевту без форми, порожній список і картка, якої
  не існує, «Sign out» для користувача без ролі.
- `clients`: пошук дитини за email опікуна, помилки полів картки, дублікат картки дитини.
- `slot-holds`: дата AC-HOLD-24, AC-HOLD-40 без речення про список клієнтів, прострочене утримання поруч із новим,
  сторінки планувальника недоступні терапевту.

## Users & roles

| Роль | Сутність | Що змінюється |
|---|---|---|
| `scheduler`, `admin` | Картка клієнта | помилки полів одразу й біля полів; дублікат дитини відхилено (C); порожній список і неіснуюча картка — свої повідомлення (R) |
| `scheduler`, `admin` | Утримання | дитину знаходять за email опікуна (C); прострочений запис лишається поруч із новим до початку слоту (R) |
| `therapist` | Картка клієнта | свій клієнт лише до початку слоту «Held» або з «Confirmed» без обмеження в часі (R); форми нової картки не бачить (—) |
| `therapist` | Слоти й утримання планувальника | сторінки недоступні: «Only schedulers and admins can view this page.» (—) |
| без ролі | Застосунок | повідомлення й «Sign out» (—) |

## Non-goals

- Редагування й видалення карток клієнтів, пошук і фільтри в самому списку клієнтів.
- Пара чи сім'я як клієнт — WS9; документи згоди — WS8.
- Керування ролями в застосунку.

## Assumptions

- (PM) Нову картку створюють лише повною формою; швидкої форми лише з ім'ям та email немає. AC-HOLD-10, 11, 15, 16,
  34, 35, 39, 41 перевіряють ім'я та email у повній формі, де решта полів коректні; їхні повідомлення не змінюються.
  «Not provided» — лише в картках, створених до зрізу 2 (Sofiia-pm/therapy-scheduling-spec#20).
- (PM) Повідомлення полів картки: тип не вибрано — «Select a client type.»; ім'я або email дорослого — «Enter the
  client's name and a valid email.»; ім'я дитини — «Enter the client's name.»; дата народження — «Enter a date of
  birth that is not in the future.»; мова — «Select a session language.»; опікун — «Enter the guardian's name and a
  valid email.». Дата народження, що дорівнює сьогоднішній, коректна.
- (PM) Дані опікуна — частина кожної картки дитини; email опікуна зберігається малими літерами без крайових пробілів
  і може повторюватися в картках кількох дітей та збігатися з email дорослого; для нього діє лише правило коректного
  email (Sofiia-pm/therapy-scheduling-spec#22).
- (PM) Перетин утримань і сеансів (AC-HOLD-25, 26) рахуємо в межах однієї картки клієнта; діти з тим самим опікуном —
  різні клієнти (Sofiia-pm/therapy-scheduling-spec#26).
- (PM) Терапевтом в утриманні можна вибрати лише користувача з роллю `therapist`; сид доступності therapist1 і
  therapist2 — понеділок–п'ятниця 09:00–16:00 на 8 тижнів, без слотів у вихідні. Дати в «Дано» — приклади для тестів.
- (PM) Терапевти не мають доступу до сторінок слотів і утримань планувальника.

## Open questions

- Немає: Q4 (Sofiia-pm/therapy-scheduling-spec#23) — відповідь B, Q5 (Sofiia-pm/therapy-scheduling-spec#24) —
  відповідь A, решта питань #20–#31 закрито 2026-10-26.
