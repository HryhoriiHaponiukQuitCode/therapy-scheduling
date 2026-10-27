-- Доступність терапевтів за описом сиду PM (impl-client-cards, задача 5; вимога зрізу 1, журнал змін 2026-10-26):
-- therapist1 і therapist2 — з понеділка по п'ятницю, перший слот о 09:00, останній о 16:00 (end_hour 17), на 8 тижнів
-- уперед від сьогодні; у суботу й неділю слотів немає (AC-HOLD-24, AC-HOLD-30).
-- Ризик: видаляє й заново вставляє рядки доступності лише цих двох синтетичних терапевтів (*@example.test); утримання
-- й сеанси не змінюються. Застосовані міграції не редагуємо: private.hold_slot з 20261027195559 замінюємо цілком,
-- додаючи лише межу 8 тижнів до SLOT_UNKNOWN.

delete from public.therapist_availability
where lower(therapist_email) in ('therapist1@example.test', 'therapist2@example.test');

insert into public.therapist_availability (therapist_email, weekday, start_hour, end_hour)
select email, weekday, 9, 17
from unnest(array['therapist1@example.test', 'therapist2@example.test']) as email
cross join generate_series(1, 5) as weekday;

create or replace function private.hold_slot(
  p_therapist_id uuid,
  p_slot_start timestamptz,
  p_client_id uuid
)
returns public.holds
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_local timestamp;
  v_hold public.holds;
begin
  -- AC-HOLD-08: утримують лише admin і scheduler.
  if not private.is_staff() then
    raise exception 'NOT_STAFF' using errcode = 'P0001';
  end if;

  -- AC-HOLD-04: одночасні спроби утримати той самий слот виконуються по черзі до кінця транзакції.
  perform pg_advisory_xact_lock(
    hashtextextended(p_therapist_id::text || '|' || extract(epoch from p_slot_start)::text, 0)
  );
  -- AC-HOLD-25: так само по черзі — спроби утримати той самий час за тим самим клієнтом у різних терапевтів.
  -- Блокування завжди беремо в одному порядку (слот, потім клієнт), тож взаємного очікування немає.
  perform pg_advisory_xact_lock(
    hashtextextended('client|' || p_client_id::text || '|' || extract(epoch from p_slot_start)::text, 0)
  );

  -- AC-HOLD-07: слот, що вже почався (з хвилини початку включно), утримати не можна.
  if p_slot_start <= now() then
    raise exception 'SLOT_STARTED' using errcode = 'P0001';
  end if;

  -- Слот має бути в доступності терапевта: початок години за часом практики.
  select p.email into v_email
  from public.profiles as p
  where p.id = p_therapist_id and p.role = 'therapist';

  v_local := p_slot_start at time zone 'America/Los_Angeles';
  if v_email is null
     or date_trunc('hour', v_local) <> v_local
     -- Доступність — на 8 тижнів уперед від сьогодні за часом практики (сид PM, Sofiia-pm/therapy-scheduling-spec#2).
     or v_local::date > (now() at time zone 'America/Los_Angeles')::date + 56
     or not exists (
       select 1
       from public.therapist_availability as a
       where lower(a.therapist_email) = lower(v_email)
         and a.weekday = extract(isodow from v_local)
         and extract(hour from v_local) >= a.start_hour
         and extract(hour from v_local) < a.end_hour
     ) then
    raise exception 'SLOT_UNKNOWN' using errcode = 'P0001';
  end if;

  -- AC-HOLD-03, AC-HOLD-17: слот уже має активне утримання (< 1440 хв) або підтверджений сеанс.
  if exists (
    select 1
    from public.holds as h
    where h.therapist_id = p_therapist_id
      and h.slot_start = p_slot_start
      and (h.confirmed_at is not null or now() < h.created_at + interval '1440 minutes')
  ) then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.clients as c where c.id = p_client_id) then
    raise exception 'CLIENT_UNKNOWN' using errcode = 'P0001';
  end if;

  -- AC-HOLD-25: у клієнта вже є «Held» (не прострочене) або «Confirmed» на цей час у будь-якого терапевта.
  -- Прострочене не заважає (AC-HOLD-26, AC-HOLD-37).
  if exists (
    select 1
    from public.holds as h
    where h.client_id = p_client_id
      and h.slot_start = p_slot_start
      and (h.confirmed_at is not null or now() < h.created_at + interval '1440 minutes')
  ) then
    raise exception 'CLIENT_BUSY' using errcode = 'P0001';
  end if;

  -- AC-HOLD-02: утримання на 24 години від цього моменту (created_at = now()).
  insert into public.holds (therapist_id, slot_start, client_id, created_by)
  values (p_therapist_id, p_slot_start, p_client_id, (select auth.uid()))
  returning * into v_hold;

  return v_hold;
end;
$$;
