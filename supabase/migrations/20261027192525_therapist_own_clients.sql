-- Свій клієнт терапевта (impl-client-cards, задача 3: AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-14).
-- Відповідь PM на Sofiia-pm/therapy-scheduling-spec#25: утримання «Held» робить клієнта своїм лише до початку слоту;
-- підтверджений сеанс «Confirmed» — без обмеження в часі (зокрема минулий). Прострочене утримання — ні.
-- Політику зрізу 1 (20261019204522_therapist_clients.sql) замінюємо: застосовані міграції не редагуємо.
-- Утримання терапевт і так бачить лише власні (holds_select_own_therapist), тож підзапит — під його RLS.

drop policy clients_select_own_therapist on public.clients;

create policy clients_select_own_therapist
  on public.clients
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.holds as h
      where h.client_id = clients.id
        and h.therapist_id = (select auth.uid())
        and (
          h.confirmed_at is not null                                    -- «Confirmed»: AC-CARD-04, AC-CARD-14
          or (now() < h.created_at + interval '1440 minutes'            -- «Held», не прострочене: AC-CARD-08
              and now() < h.slot_start)                                 -- і слот ще не почався: AC-CARD-14
        )
    )
  );
