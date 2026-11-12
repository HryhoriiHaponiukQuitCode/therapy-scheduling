-- Зміна статусу перевірки страхування (impl-insurance-status, задача 2: AC-INS-02, 03, 05, 06).
-- Колонковий grant: authenticated змінює лише insurance_status, решта полів картки, як і раніше, незмінна.
-- Політика: змінювати може лише admin або scheduler (private.is_staff() бере роль з profiles за auth.uid() і для
-- невідомого користувача повертає false). Терапевт під RLS не бачить рядка для update — 0 рядків, статус той самий
-- (AC-INS-05). with check не дає повернути 'not_set' (вимога «Позначення статусу…»): база відповідає 42501.
-- anon прав не має (AC-INS-06). Правила міграцій — у заголовку 20261012000000_profiles_and_roles.sql і в AGENTS.md.

grant update (insurance_status) on public.clients to authenticated;                      -- AC-INS-02, 03

create policy clients_update_insurance_staff
  on public.clients for update to authenticated
  using ((select private.is_staff()))                                                    -- AC-INS-05
  with check ((select private.is_staff()) and insurance_status <> 'not_set');            -- AC-INS-02
