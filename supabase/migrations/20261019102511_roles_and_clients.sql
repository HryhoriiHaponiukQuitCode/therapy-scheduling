-- Ролі продукту й картка клієнта (impl-slot-hold, задача 1.1: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16).
-- Правила міграцій — у заголовку 20261012000000_profiles_and_roles.sql і в AGENTS.md → «База даних».

-- ── Ролі: admin / scheduler / therapist замість member / admin шаблону ───────
-- Порядок важливий: старий constraint не пускає нові значення в update, а тригер
-- on_auth_user_created вставляє профіль із default — тому дані й default до нового constraint.
alter table public.profiles drop constraint profiles_role_check;               -- 1) зняти старе правило
update public.profiles set role = 'therapist' where role = 'member';           -- 2) наявні дані
alter table public.profiles alter column role set default 'therapist';         -- 3) default — найменші права
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'scheduler', 'therapist'));  -- 4) нове правило

-- ── Хелпер: чи поточний користувач — працівник, що веде клієнтів і утримання ──
-- security definer: читає profiles в обхід RLS, тож політики не зациклюються (42P17).
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role in ('admin', 'scheduler') from public.profiles as p where p.id = (select auth.uid())),
    false
  );
$$;

revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

-- ── Таблиця clients ──────────────────────────────────────────────────────────
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null
             constraint clients_full_name_not_blank check (length(btrim(full_name)) > 0)           -- AC-HOLD-11
             constraint clients_full_name_length check (length(full_name) <= 200),
  email      text not null
             constraint clients_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')  -- AC-HOLD-15
             constraint clients_email_length check (length(email) <= 254),
  -- Хто створив картку; set null — щоб видалення користувача в Auth (каскад на profiles) не впиралося в клієнтів.
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.clients is
  'Картка клієнта (зріз 1: лише ім''я та email). Створюють admin і scheduler; редагування й видалення — поза зрізом.';

-- Email унікальний без урахування регістру (AC-HOLD-16).
create unique index clients_email_lower_key on public.clients (lower(email));
create index clients_created_by_idx on public.clients (created_by);

alter table public.clients enable row level security;

-- ── Права (GRANT) ────────────────────────────────────────────────────────────
revoke all on table public.clients from anon, authenticated;
grant select on table public.clients to authenticated;
-- Колонковий grant: created_by ставить default auth.uid(), id і created_at — база.
grant insert (full_name, email) on table public.clients to authenticated;
grant select, insert, update, delete on table public.clients to service_role;
-- update і delete для authenticated свідомо не видаємо: у зрізі 1 картку не змінюють і не видаляють.

-- ── Політики RLS ─────────────────────────────────────────────────────────────
-- Терапевт бачитиме клієнтів власних утримань — політику додає задача 5.1 разом із таблицею holds.
create policy clients_select_staff
  on public.clients
  for select
  to authenticated
  using ((select private.is_staff()));

create policy clients_insert_staff
  on public.clients
  for insert
  to authenticated
  with check (
    (select private.is_staff())
    and created_by = (select auth.uid())
  );
