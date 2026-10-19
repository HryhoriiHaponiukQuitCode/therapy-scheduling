-- Підтвердження лише до початку слоту (зміна clarify-slot-hold: AC-HOLD-22, AC-HOLD-23; відповідь PM на Q1 —
-- Sofiia-pm/therapy-scheduling-spec#3). Нова версія private.confirm_hold замість застосованої
-- 20261019125609_confirm_hold.sql (її не редагуємо); обгортка public.confirm_hold і права не змінюються.
-- Порядок перевірок: роль → утримання → блокування слоту → уже підтверджене → прострочене (AC-HOLD-13) →
-- слот уже почався (AC-HOLD-22, лише для непростроченого) → підтвердження.

create or replace function private.confirm_hold(p_hold_id uuid)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hold public.holds;
  v_now timestamptz;
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
  -- Час після блокування: now() — початок транзакції, а очікування блокування може перетнути межу.
  v_now := clock_timestamp();

  if v_hold.confirmed_at is not null then
    raise exception 'HOLD_CONFIRMED' using errcode = 'P0001';
  end if;

  -- AC-HOLD-13: прострочене утримання (1440 хв від створення) не підтверджується;
  -- так само, якщо слот уже утримали знову після прострочення.
  if v_now >= v_hold.created_at + interval '1440 minutes'
     or exists (
       select 1
       from public.holds as h
       where h.therapist_id = v_hold.therapist_id
         and h.slot_start = v_hold.slot_start
         and h.id <> v_hold.id
         and (h.confirmed_at is not null or v_now < h.created_at + interval '1440 minutes')
     ) then
    raise exception 'HOLD_EXPIRED' using errcode = 'P0001';
  end if;

  -- AC-HOLD-22: з моменту початку слоту (включно) непрострочене утримання не підтверджується й лишається «Held».
  -- AC-HOLD-23: за хвилину до початку — підтверджується.
  if v_hold.slot_start <= v_now then
    raise exception 'SLOT_STARTED_CONFIRM' using errcode = 'P0001';
  end if;

  -- AC-HOLD-12: утримання стає сеансом — «Confirmed», без «Held until», слот лишається зайнятим.
  update public.holds as h
  set confirmed_at = v_now,
      confirmed_by = (select auth.uid())
  where h.id = p_hold_id
  returning * into v_hold;

  return v_hold;
end;
$$;

revoke execute on function private.confirm_hold(uuid) from public, anon;
grant execute on function private.confirm_hold(uuid) to authenticated;
