-- Розклад терапевта на тиждень (impl-client-cards, задача 5: AC-HOLD-09, AC-HOLD-30, AC-HOLD-31, AC-HOLD-40, AC-HOLD-42).
-- Навіщо функція: утримання «Held», чий слот уже почався, лишається «Held» у розкладі до прострочення (AC-HOLD-42),
-- а clients_select_own_therapist такого клієнта вже не показує (AC-CARD-14). Тож ім'я клієнта дає функція, а не RLS
-- clients, і лише ім'я — без email та інших даних картки (AC-HOLD-40).
-- Повертає лише власні «Held» (не прострочені) і «Confirmed»: прострочене не показуємо, щоб функція не відкривала
-- імені клієнта, якого RLS уже не показує терапевту (AC-HOLD-21, AC-CARD-08).
-- Логіка — у private (security definer, search_path = ''), у public — тонка обгортка security invoker для rpc.

create or replace function private.my_schedule(p_from date, p_to date)
returns table (
  id uuid,
  slot_start timestamptz,
  created_at timestamptz,
  confirmed_at timestamptz,
  client_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Лише терапевт і лише власний розклад (AC-HOLD-09); без ролі чи з іншою роллю — відмова.
  if private.current_app_role() is distinct from 'therapist' then
    raise exception 'NOT_THERAPIST' using errcode = 'P0001';
  end if;

  return query
  select h.id, h.slot_start, h.created_at, h.confirmed_at, c.full_name
  from public.holds as h
  join public.clients as c on c.id = h.client_id
  where h.therapist_id = (select auth.uid())
    -- Дні [p_from, p_to) за часом практики.
    and h.slot_start >= (p_from::timestamp at time zone 'America/Los_Angeles')
    and h.slot_start < (p_to::timestamp at time zone 'America/Los_Angeles')
    and (h.confirmed_at is not null or now() < h.created_at + interval '1440 minutes')
  order by h.slot_start;
end;
$$;

revoke execute on function private.my_schedule(date, date) from public, anon;
grant execute on function private.my_schedule(date, date) to authenticated;

-- Обгортка для supabase.rpc('my_schedule', …): Data API бачить лише public.
create or replace function public.my_schedule(p_from date, p_to date)
returns table (
  id uuid,
  slot_start timestamptz,
  created_at timestamptz,
  confirmed_at timestamptz,
  client_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.my_schedule(p_from, p_to);
$$;

revoke execute on function public.my_schedule(date, date) from public, anon;
grant execute on function public.my_schedule(date, date) to authenticated;
