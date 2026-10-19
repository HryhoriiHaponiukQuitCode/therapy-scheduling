-- Доступність терапевтів і утримання слотів (impl-slot-hold, задача 2.1: AC-HOLD-01, AC-HOLD-05, AC-HOLD-06, AC-HOLD-18).
-- Правила міграцій — у заголовку 20261012000000_profiles_and_roles.sql і в AGENTS.md → «База даних».
-- Утримання створює й підтверджує лише функції hold_slot / confirm_hold (задачі 3.1 і 4.1): прямих insert/update немає.

-- ── Доступність терапевтів (початкові дані) ─────────────────────────────────
-- Прив'язка за email: користувачів створює npm run users:demo уже після міграцій, тож id ще невідомі.
-- Слот — 60 хвилин від початку години в America/Los_Angeles (Assumptions специфікації).
create table public.therapist_availability (
  id              bigint generated always as identity primary key,
  therapist_email text not null,
  weekday         smallint not null constraint therapist_availability_weekday check (weekday between 1 and 7), -- ISO: 1 = пн
  start_hour      smallint not null constraint therapist_availability_start check (start_hour between 0 and 23),
  end_hour        smallint not null constraint therapist_availability_end check (end_hour between 1 and 24),
  constraint therapist_availability_range check (start_hour < end_hour),
  constraint therapist_availability_unique unique (therapist_email, weekday, start_hour)
);

comment on table public.therapist_availability is
  'Тижнева доступність терапевта за email (зріз 1 — лише початкові дані; редагування — поза зрізом).';

alter table public.therapist_availability enable row level security;

revoke all on table public.therapist_availability from anon, authenticated;
grant select on table public.therapist_availability to authenticated;
grant select, insert, update, delete on table public.therapist_availability to service_role;

-- Email поточного користувача з його профілю (не з JWT): прив'язка доступності — за email.
-- security definer: читає profiles в обхід RLS, тож політики не зациклюються (42P17).
create or replace function private.current_profile_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(p.email) from public.profiles as p where p.id = (select auth.uid());
$$;

revoke execute on function private.current_profile_email() from public, anon;
grant execute on function private.current_profile_email() to authenticated;

-- Матриця прав: admin і scheduler бачать слоти всіх терапевтів, терапевт — лише власні.
create policy therapist_availability_select_staff
  on public.therapist_availability
  for select
  to authenticated
  using ((select private.is_staff()));

create policy therapist_availability_select_own_therapist
  on public.therapist_availability
  for select
  to authenticated
  using (lower(therapist_email) = (select private.current_profile_email()));

-- therapist1: пн, вт, чт, пт 09:00–17:00 (середа без слотів); therapist2: пн–пт 10:00–16:00.
insert into public.therapist_availability (therapist_email, weekday, start_hour, end_hour)
values
  ('therapist1@example.test', 1, 9, 17),
  ('therapist1@example.test', 2, 9, 17),
  ('therapist1@example.test', 4, 9, 17),
  ('therapist1@example.test', 5, 9, 17),
  ('therapist2@example.test', 1, 10, 16),
  ('therapist2@example.test', 2, 10, 16),
  ('therapist2@example.test', 3, 10, 16),
  ('therapist2@example.test', 4, 10, 16),
  ('therapist2@example.test', 5, 10, 16)
on conflict on constraint therapist_availability_unique do nothing;

-- ── Утримання ────────────────────────────────────────────────────────────────
-- Статус похідний і рахується під час читання (без фонових задач):
--   confirmed_at є → «Confirmed»; інакше now() < created_at + 1440 хв → «Held», інакше «Expired».
create table public.holds (
  id           uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles (id) on delete cascade,
  slot_start   timestamptz not null
               constraint holds_slot_on_the_hour check (date_trunc('hour', slot_start) = slot_start),
  client_id    uuid not null references public.clients (id) on delete cascade,
  created_at   timestamptz not null default now(),
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null
);

comment on table public.holds is
  'Утримання слоту терапевта за клієнтом на 24 години; підтверджене — сеанс. Пише лише hold_slot / confirm_hold.';

create index holds_therapist_slot_idx on public.holds (therapist_id, slot_start);
create index holds_client_id_idx on public.holds (client_id);
create index holds_created_by_idx on public.holds (created_by);
create index holds_confirmed_by_idx on public.holds (confirmed_by);

alter table public.holds enable row level security;

revoke all on table public.holds from anon, authenticated;
grant select on table public.holds to authenticated;
grant select, insert, update, delete on table public.holds to service_role;
-- insert/update/delete для authenticated свідомо не видаємо: запис — лише функціями (задачі 3.1, 4.1).

-- Планувальник і адміністратор бачать усі утримання й сеанси (матриця прав).
create policy holds_select_staff
  on public.holds
  for select
  to authenticated
  using ((select private.is_staff()));

-- Терапевт — лише власні (AC-HOLD-09).
create policy holds_select_own_therapist
  on public.holds
  for select
  to authenticated
  using (therapist_id = (select auth.uid()));

-- ── Профілі терапевтів для планувальника (вибір терапевта на /slots) ────────
create policy profiles_select_therapists_for_staff
  on public.profiles
  for select
  to authenticated
  using (role = 'therapist' and (select private.is_staff()));
