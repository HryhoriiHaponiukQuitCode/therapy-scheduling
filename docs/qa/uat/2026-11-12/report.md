# Звіт UAT — 12.11.2026

- **Застосунок:** https://therapy-scheduling-two.vercel.app (/api/health: коміт `d95aece`)
- **Код тестів:** `task/uat-insurance` @ `e57a61a`
- **Прогін:** 12.11.2026, 21:33 (Київ), Playwright 66.7 с; AC: 9 — PASS 9, FAIL 0, NEEDS-HUMAN 0
- **Рецензент:** `claude-haiku-5-5`; суперечки → `claude-sonnet-5-5`. Разом за розбір: $0.0214 (ціни API; за підпискою — у межах ліміту плану)
- **Прибирання:** синтетичних uat-*@example.test видалено 0, лишилось 0, їхніх рядків, що лишились: 0; карток клієнтів UAT видалено 6, лишилось 0
- **Відео й траси:** не в git — `test-results/` локально або артефакт CI; трасу відкриває `npx playwright show-trace <trace.zip>`

| AC | Перевірки | Агент | Підсумок | Чому | Playwright | Розбір |
|---|---|---|---|---|---|---|
| AC-CARD-05 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 6.4 с | $0.0024, 9.1 с |
| AC-CARD-06 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 5.6 с | $0.0021, 9.3 с |
| AC-CARD-16 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 4.6 с | $0.0027, 10.9 с |
| AC-INS-01 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 3.0 с | $0.0020, 6.9 с |
| AC-INS-02 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 10.5 с | $0.0026, 8.5 с |
| AC-INS-03 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 6.5 с | $0.0026, 7.7 с |
| AC-INS-04 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 4.0 с | $0.0022, 8.4 с |
| AC-INS-05 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 5.7 с | $0.0020, 6.4 с |
| AC-INS-06 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 5.0 с | $0.0028, 10.0 с |

## AC-CARD-05 — PASS

**Тест:** AC-CARD-05: therapist1 відкриває картку клієнта therapist2 за прямим посиланням — «You don't have access to this client.», даних немає, картка не змінилась

**Критерій** (requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md):

> AC-CARD-05: Дано client9 — свій клієнт лише для therapist2. Коли therapist1 відкриває картку client9 за прямим посиланням. Тоді therapist1 бачить повідомлення «You don't have access to this client.», жодних даних client9 не показано, і картка client9 не змінилася.

![Кадр «Тоді» 1](frames/AC-CARD-05-then-1.png)

**Кроки:** ✔ Дано: клієнт — свій лише для therapist2 (є в списку therapist2, немає в списку therapist1) → ✔ Коли: therapist1 відкриває картку цього клієнта за прямим посиланням → ✔ Тоді: therapist1 бачить повідомлення «You don't have access to this client.», жодних даних client9 не показано, і картка client9 не змінилася

**Агент (claude-haiku-5-5, PASS):** На кадрі сторінки «Client» видно одне повідомлення в картці: «You don't have access to this client.», текст читається повністю і збігається з критерієм. Картки клієнта, email клієнта чи інших даних на кадрі немає (ці пункти не з кадрів, не оцінюю). Апостроф у «don't» на цій роздільній здатності виглядає прямим, як у критерії, але дрібний знак, тож перевір його за потреби.

**Цитати агента, звірені зі сторінкою (aria):**
- «You don't have access to this client.» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-access-терапевт-AC--cff9b-х-немає-картка-не-змінилась-chromium/video.webm` · **траса:** `test-results/artifacts/client-access-терапевт-AC--cff9b-х-немає-картка-не-змінилась-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-CARD-05 — …») · @login: ____

## AC-CARD-06 — PASS

**Тест:** AC-CARD-06: therapist1 відкриває форму нової картки за прямим посиланням — форми немає, «Only schedulers and admins can create client cards.», кількість карток та сама

**Критерій** (requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md):

> AC-CARD-06: Дано therapist1 увійшов у застосунок. Коли він відкриває форму нової картки клієнта за прямим посиланням. Тоді форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася.

![Кадр «Тоді» 1](frames/AC-CARD-06-then-1.png)

**Кроки:** ✔ Дано: therapist1 увійшов у застосунок → ✔ Коли: він відкриває форму нової картки клієнта за прямим посиланням → ✔ Тоді: форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася

**Агент (claude-haiku-5-5, PASS):** На кадрі сторінки /clients/new видно заголовок «New client» і одне повідомлення «Only schedulers and admins can create client cards.», що збігається з критерієм посимвольно. Полів форми й кнопки створення на кадрі немає, тож друга видима частина «Тоді» виконується; цитата для неї — лише заголовок, єдиний текст сторінки крім повідомлення. Частину про незмінну кількість карток не оцінював, бо вона з розділу «Не з кадрів».

**Цитати агента, звірені зі сторінкою (aria):**
- «Only schedulers and admins can create client cards.» — є на сторінці
- «New client» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-access-терапевт-AC--d8e4b--»-кількість-карток-та-сама-chromium/video.webm` · **траса:** `test-results/artifacts/client-access-терапевт-AC--d8e4b--»-кількість-карток-та-сама-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-CARD-06 — …») · @login: ____

## AC-CARD-16 — PASS

**Тест:** AC-CARD-16: scheduler1, а потім therapist1 відкривають посилання на картку, якої немає — «This client card doesn't exist.» і «You don't have access to this client.», даних клієнтів немає

**Критерій** (requirements/19-planuvalnyk-zapovniuie-kartku-kliienta.md):

> AC-CARD-16: Дано картки клієнта, на яку веде посилання, не існує. Коли scheduler1, а потім therapist1 відкриває це посилання. Тоді scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів.

![Кадр «Тоді» 1](frames/AC-CARD-16-then-1.png)
![Кадр «Тоді» 2](frames/AC-CARD-16-then-2.png)

**Кроки:** ✔ Дано: картки клієнта, на яку веде посилання, не існує → ✔ Коли: scheduler1 відкриває це посилання → ✔ Тоді: scheduler1 бачить повідомлення «This client card doesn't exist.» і не бачить жодних даних клієнтів → ✔ Коли: потім therapist1 відкриває це саме посилання → ✔ Тоді: therapist1 бачить повідомлення «You don't have access to this client.» і не бачить жодних даних клієнтів

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1 видно сесію scheduler1 (scheduler1@example.test) і єдиний напис «This client card doesn't exist.» без жодної картки клієнта. На кадрі frame-then-2 видно сесію therapist1 (therapist1@example.test) і напис «You don't have access to this client.», дані клієнтів не показані. Апостроф у кадрах виглядає прямим, як у критерії; у роздільній здатності скріна перевірити це на 100% неможливо, але слова і пунктуація збігаються.

**Цитати агента, звірені зі сторінкою (aria):**
- «This client card doesn't exist.» — є на сторінці
- «You don't have access to this client.» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-access-посилання-на-4de47-ient-»-даних-клієнтів-немає-chromium/video.webm` · **траса:** `test-results/artifacts/client-access-посилання-на-4de47-ient-»-даних-клієнтів-немає-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-CARD-16 — …») · @login: ____

## AC-INS-01 — PASS

**Тест:** AC-INS-01: scheduler1 відкриває картку client6, статус якої ще ніхто не позначав — «Insurance: Not set»

**Критерій** (requirements/33-planuvalnyk-status-strakhuvannia.md):

> AC-INS-01: Дано картку client6 створено, і статус перевірки страхування ще ніхто не позначав. Коли scheduler1 відкриває картку client6. Тоді в картці показано «Insurance: Not set».

![Кадр «Тоді» 1](frames/AC-INS-01-then-1.png)

**Кроки:** ✔ Дано: картку client6 створено, і статус перевірки страхування ще ніхто не позначав → ✔ Коли: scheduler1 відкриває картку client6 → ✔ Тоді: в картці показано «Insurance: Not set»

**Агент (claude-haiku-5-5, PASS):** На кадрі видно картку «Client Six 261112193314» з рядком «Insurance: Not set» над полем «Insurance status» (вибрано «Choose a status», кнопка Save неактивна). Текст читається повністю і збігається з критерієм посимвольно. Адресний рядок на кадрі не видно, тож відповідність URL не оцінювалась.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Not set» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-insurance-плануваль-00e66-начав-—-«Insurance-Not-set»-chromium/video.webm` · **траса:** `test-results/artifacts/client-insurance-плануваль-00e66-начав-—-«Insurance-Not-set»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-01 — …») · @login: ____

## AC-INS-02 — PASS

**Тест:** AC-INS-02: scheduler1 позначає статус «Verified» у картці client6 — «Insurance status saved.» і «Insurance: Verified», зокрема після повторного відкриття

**Критерій** (requirements/33-planuvalnyk-status-strakhuvannia.md):

> AC-INS-02: Дано картка client6 показує «Insurance: Not set». Коли scheduler1 позначає статус перевірки страхування «Verified». Тоді scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову.

![Кадр «Тоді» 1](frames/AC-INS-02-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-02-then-2.png)

**Кроки:** ✔ Дано: картка client6 показує «Insurance: Not set» → ✔ Коли: scheduler1 позначає статус перевірки страхування «Verified» → ✔ Тоді: scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified» → ✔ Коли: scheduler1 відкриває картку client6 знову → ✔ Тоді: картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову

**Агент (claude-haiku-5-5, PASS):** На frame-then-1.png видно зелене повідомлення «Insurance status saved.» і рядок «Insurance: Verified» у картці, у полі статусу вибрано Verified. На frame-then-2.png після повторного відкриття картки рядок «Insurance: Verified» присутній. Заголовок сторінки — «Client Six 261112193314», а не «client6»; частини «Тоді» не згадують імені, тому це не впливає на оцінку, але ідентифікацію картки варто звірити вручну. Статус у базі не оцінювався (за розділом «Не з кадрів»).

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance status saved.» — є на сторінці
- «Insurance: Verified» — є на сторінці
- «Insurance: Verified» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-insurance-плануваль-37625--після-повторного-відкриття-chromium/video.webm` · **траса:** `test-results/artifacts/client-insurance-плануваль-37625--після-повторного-відкриття-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-02 — …») · @login: ____

## AC-INS-03 — PASS

**Тест:** AC-INS-03: admin1 змінює статус client7 з «Verified» на «Private pay», потім scheduler2 відкриває картку — обидва бачать «Insurance: Private pay»

**Критерій** (requirements/33-planuvalnyk-status-strakhuvannia.md):

> AC-INS-03: Дано картка client7 показує «Insurance: Verified». Коли admin1 змінює статус перевірки страхування на «Private pay», а потім scheduler2 відкриває картку client7. Тоді і admin1, і scheduler2 бачать у картці «Insurance: Private pay».

![Кадр «Тоді» 1](frames/AC-INS-03-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-03-then-2.png)

**Кроки:** ✔ Дано: картка client7 показує «Insurance: Verified» → ✔ Коли: admin1 змінює статус перевірки страхування на «Private pay» → ✔ Тоді: admin1 бачить у картці «Insurance: Private pay» → ✔ Коли: потім scheduler2 відкриває картку client7 → ✔ Тоді: scheduler2 бачить у картці «Insurance: Private pay»

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1 у верхньому правому куті видно сесію admin1@example.test, а в картці клієнта Client Seven — рядок «Insurance: Private pay» і підтвердження «Insurance status saved.». На кадрі frame-then-2 сесія scheduler2@example.test, і в тій самій картці знову видно «Insurance: Private pay». Обидві видимі частини «Тоді» підтверджені; статус у базі не оцінювався.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Private pay» — є на сторінці
- «Insurance: Private pay» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-insurance-плануваль-9c717-ать-«Insurance-Private-pay»-chromium/video.webm` · **траса:** `test-results/artifacts/client-insurance-плануваль-9c717-ать-«Insurance-Private-pay»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-03 — …») · @login: ____

## AC-INS-04 — PASS

**Тест:** AC-INS-04: therapist1 відкриває картку свого клієнта client6 — «Insurance: Not accepted», змінити статус не запропоновано

**Критерій** (requirements/33-planuvalnyk-status-strakhuvannia.md):

> AC-INS-04: Дано client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted». Коли therapist1 відкриває картку client6. Тоді він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано.

![Кадр «Тоді» 1](frames/AC-INS-04-then-1.png)

**Кроки:** ✔ Дано: client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted» → ✔ Коли: therapist1 відкриває картку client6 → ✔ Тоді: він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано

**Агент (claude-haiku-5-5, PASS):** На кадрі сторінка «Client card» з блоком «Intake form»: Client type, Date of birth, Session language, Email і рядок «Insurance: Not accepted». Поля «Insurance status» і кнопки «Save» на кадрі немає, тож друга частина «Тоді» видима і виконана. Цитата для другої частини — єдиний рядок страхування в картці, бо це твердження про відсутність елементів.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Not accepted» — є на сторінці
- «Insurance: Not accepted» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-insurance-терапевт--7aa85-ити-статус-не-запропоновано-chromium/video.webm` · **траса:** `test-results/artifacts/client-insurance-терапевт--7aa85-ити-статус-не-запропоновано-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-04 — …») · @login: ____

## AC-INS-05 — PASS

**Тест:** AC-INS-05: therapist1 напряму, оминаючи сторінки, пробує змінити статус client6 на «Verified» — статус не змінився, scheduler1 бачить «Insurance: Not accepted»

**Критерій** (requirements/33-planuvalnyk-status-strakhuvannia.md):

> AC-INS-05: Дано client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted». Коли therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified». Тоді статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted».

![Кадр «Тоді» 1](frames/AC-INS-05-then-1.png)

**Кроки:** ✔ Дано: client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted» → ✔ Коли: therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус client6 на «Verified» → ✔ Коли: scheduler1 відкриває картку client6 → ✔ Тоді: статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted»

**Агент (claude-haiku-5-5, PASS):** На кадрі видно сторінку картки «Client Six 261112193314» із сесією scheduler1@example.test, і в картці рядок «Insurance: Not accepted». Статус не змінився. Частини «Не з кадрів» (RLS, стан бази) не оцінювалися.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance: Not accepted» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-insurance-терапевт--a1b1e-ть-«Insurance-Not-accepted»-chromium/video.webm` · **траса:** `test-results/artifacts/client-insurance-терапевт--a1b1e-ть-«Insurance-Not-accepted»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-05 — …») · @login: ____

## AC-INS-06 — PASS

**Тест:** AC-INS-06: користувач без входу відкриває картку client6 за прямим посиланням — лише сторінка входу, а scheduler1 далі бачить «Insurance: Verified»

**Критерій** (requirements/33-planuvalnyk-status-strakhuvannia.md):

> AC-INS-06: Дано користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified». Коли він відкриває картку client6 за прямим посиланням. Тоді він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано, а scheduler1 після цього бачить у картці client6 «Insurance: Verified».

![Кадр «Тоді» 1](frames/AC-INS-06-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-06-then-2.png)

**Кроки:** ✔ Дано: користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified» → ✔ Коли: він відкриває картку client6 за прямим посиланням → ✔ Тоді: він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано → ✔ Коли: scheduler1 після цього відкриває картку client6 → ✔ Тоді: scheduler1 після цього бачить у картці client6 «Insurance: Verified»

**Агент (claude-haiku-5-5, PASS):** На frame-then-1.png видно сторінку входу «Sign in» з полями «Email», «Password» і кнопкою «Sign in», без жодних даних клієнта. На frame-then-2.png у картці «Client Six 261112193314» під сесією scheduler1.. (scheduler1@example.test) видно рядок «Insurance: Verified». Обидві видимі частини підтверджено.

**Цитати агента, звірені зі сторінкою (aria):**
- «Email» — є на сторінці
- «Password» — є на сторінці
- «Sign in» — є на сторінці
- «Insurance: Verified» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/client-insurance-без-входу-b84c5-бачить-«Insurance-Verified»-chromium/video.webm` · **траса:** `test-results/artifacts/client-insurance-без-входу-b84c5-бачить-«Insurance-Verified»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-06 — …») · @login: ____

## Як читати підсумок

- **PASS** — автоматичні перевірки пройшли, агент-рецензент погодився з кадром, а кожну його цитату знайдено на сторінці.
- **FAIL** — впала автоматична перевірка. Агент цього не перекриває: невидимі вади (буфер обміну, база) він на кадрі не побачить.
- **NEEDS-HUMAN** — перевірки зелені, але агент не погодився або його цитати немає на сторінці. Часто це слабкий тест або розбіжність між текстом AC і тестом — питання до PM, а не обов'язково вада продукту.

Правила: R1: перевірка впала — FAIL завжди, агент не перекриває; R2: немає вердикту агента або кадру; R3: перевірки пройшли, агент не погоджується — вирішує людина; R4: цитати агента немає на сторінці (aria) — не підтверджено; R5: помилка сторінки або 5xx під час сценарію; R6: перевірки, агент і цитати збігаються.
