-- Денний ліміт чернеток картки клієнта (зріз 4, impl-client-intake; знахідка рев'ю коду після #62).
-- Вимога PM #36, «Припущення»: «Помічник має обмежену кількість запитів на добу; коли їх вичерпано, діє AC-INTAKE-08».
-- Модель платна (ADR 0003), тож ліміт рахує застосунок: 50 чернеток на користувача за добу практики
-- (America/Los_Angeles). Лічильник — у private (Data API його не бачить); змінює його лише функція нижче.

create table private.intake_draft_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);

revoke all on private.intake_draft_usage from public, anon, authenticated;

-- Списати один запит до моделі з денного ліміту. true — можна викликати модель; false — ліміт вичерпано, користувач
-- не працівник або не увійшов (тоді дія показує AC-INTAKE-08). Ліміт — константа тут, не параметр: клієнт не може
-- передати більший.
create or replace function private.take_intake_draft_quota()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_day date := (now() at time zone 'America/Los_Angeles')::date;
  v_ok boolean;
begin
  if v_user is null or not private.is_staff() then
    return false;
  end if;

  insert into private.intake_draft_usage as u (user_id, day, requests)
  values (v_user, v_day, 1)
  on conflict (user_id, day) do update
    set requests = u.requests + 1
    where u.requests < 50
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke execute on function private.take_intake_draft_quota() from public, anon;
grant execute on function private.take_intake_draft_quota() to authenticated;

-- Обгортка для supabase.rpc('take_intake_draft_quota'): Data API бачить лише public.
create or replace function public.take_intake_draft_quota()
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.take_intake_draft_quota();
$$;

revoke execute on function public.take_intake_draft_quota() from public, anon;
grant execute on function public.take_intake_draft_quota() to authenticated;
