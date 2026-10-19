-- Розклад терапевта (impl-slot-hold, задача 5.1: AC-HOLD-09, AC-HOLD-21).
-- Терапевт бачить клієнтів власних утримань і сеансів (матриця прав: «Бачити картки клієнтів — лише власні»).
-- Утримання терапевт уже бачить лише власні (holds_select_own_therapist), тож підзапит під його RLS.
-- Лише активні утримання й сеанси: клієнта простроченого утримання терапевт не бачить (AC-HOLD-21).
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
        and (h.confirmed_at is not null or now() < h.created_at + interval '1440 minutes')
    )
  );
