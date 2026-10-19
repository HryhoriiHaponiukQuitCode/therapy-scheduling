-- Підтвердження утримання в сеанс (impl-slot-hold, задача 4.1: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19).
-- Як і hold_slot: логіка в private (security definer, search_path = ''), у public — обгортка security invoker для rpc.
-- Коди помилок (message) server action перекладає в тексти PM.

create or replace function private.confirm_hold(p_hold_id uuid)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hold public.holds;
begin
  -- AC-HOLD-14: підтверджують лише admin і scheduler (AC-HOLD-19 — admin так само, як scheduler).
  if not private.is_staff() then
    raise exception 'NOT_STAFF_CONFIRM' using errcode = 'P0001';
  end if;

  select * into v_hold from public.holds as h where h.id = p_hold_id;
  if not found then
    raise exception 'HOLD_UNKNOWN' using errcode = 'P0001';
  end if;

  -- Той самий ключ блокування, що в hold_slot: підтвердження й нове утримання цього слоту не перетинаються.
  perform pg_advisory_xact_lock(
    hashtextextended(v_hold.therapist_id::text || '|' || extract(epoch from v_hold.slot_start)::text, 0)
  );

  select * into v_hold from public.holds as h where h.id = p_hold_id for update;

  if v_hold.confirmed_at is not null then
    raise exception 'HOLD_CONFIRMED' using errcode = 'P0001';
  end if;

  -- AC-HOLD-13: прострочене утримання (1440 хв від створення) не підтверджується;
  -- так само, якщо слот уже утримали знову після прострочення.
  if now() >= v_hold.created_at + interval '1440 minutes'
     or exists (
       select 1
       from public.holds as h
       where h.therapist_id = v_hold.therapist_id
         and h.slot_start = v_hold.slot_start
         and h.id <> v_hold.id
         and (h.confirmed_at is not null or now() < h.created_at + interval '1440 minutes')
     ) then
    raise exception 'HOLD_EXPIRED' using errcode = 'P0001';
  end if;

  -- AC-HOLD-12: утримання стає сеансом — «Confirmed», без «Held until», слот лишається зайнятим.
  update public.holds as h
  set confirmed_at = now(),
      confirmed_by = (select auth.uid())
  where h.id = p_hold_id
  returning * into v_hold;

  return v_hold;
end;
$$;

revoke execute on function private.confirm_hold(uuid) from public, anon;
grant execute on function private.confirm_hold(uuid) to authenticated;

create or replace function public.confirm_hold(p_hold_id uuid)
returns public.holds
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.confirm_hold(p_hold_id);
$$;

revoke execute on function public.confirm_hold(uuid) from public, anon;
grant execute on function public.confirm_hold(uuid) to authenticated;
