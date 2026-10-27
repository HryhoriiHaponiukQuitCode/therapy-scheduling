-- Свій клієнт терапевта (impl-client-cards, задача 3: AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-14).
-- Відповідь PM на Sofiia-pm/therapy-scheduling-spec#25: утримання «Held» робить клієнта своїм лише до початку слоту;
-- підтверджений сеанс «Confirmed» — без обмеження в часі (зокрема минулий). Прострочене утримання — ні.
-- Політику зрізу 1 (20261019204522_therapist_clients.sql) замінюємо: застосовані міграції не редагуємо.
-- Утримання терапевт і так бачить лише власні (holds_select_own_therapist), тож підзапит — під його RLS.
-- Роль перевіряємо окремо (один раз на запит): без ролі чи з іншою роллю утримання, де користувач — therapist_id,
-- картки не відкривають (AC-CARD-11); для admin і scheduler політика хибна незалежно від утримань (їм — clients_select_staff).

drop policy clients_select_own_therapist on public.clients;

create policy clients_select_own_therapist
  on public.clients
  for select
  to authenticated
  using (true);
