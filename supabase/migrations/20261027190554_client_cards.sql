-- Повна картка клієнта з анкети (impl-client-cards, задача 2: AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-06,
-- AC-CARD-12, AC-CARD-13; AC-HOLD-10, 11, 15, 16, 34, 35, 39, 41 — у повній формі).
-- Картки зрізу 1 (лише ім'я та email) лишаються дійсними: тип «adult», решта полів порожня («Not provided»).
-- Правила міграцій — у заголовку 20261012000000_profiles_and_roles.sql і в AGENTS.md → «База даних».

-- ── Нормалізація наявних карток (до нових constraint) ───────────────────────
-- Дублікатів це не створює: унікальний індекс clients_email_lower_key уже на lower(email).
update public.clients
set email = lower(btrim(email)),
    full_name = btrim(full_name)
where email <> lower(btrim(email)) or full_name <> btrim(full_name);

-- ── Колонки анкети ───────────────────────────────────────────────────────────
alter table public.clients
  add column client_type text not null default 'adult'
    constraint clients_client_type check (client_type in ('adult', 'child')),                 -- AC-CARD-01, 02
  add column birth_date date,                                                                    -- AC-CARD-12
  add column session_language text
    constraint clients_session_language check (session_language in ('English', 'Spanish')),   -- AC-CARD-12
  add column guardian_name text
    constraint clients_guardian_name_not_blank check (length(btrim(guardian_name)) > 0)
    constraint clients_guardian_name_length check (length(guardian_name) <= 200),
  add column guardian_email text
    constraint clients_guardian_email_format
      check (guardian_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')                -- AC-CARD-03
    constraint clients_guardian_email_length check (length(guardian_email) <= 254);

-- Для дитини власний email не вносять: контакт — email опікуна (припущення PM, #22).
alter table public.clients alter column email drop not null;

alter table public.clients
  -- AC-HOLD-35: email зберігається малими літерами без пробілів по краях; email опікуна — так само (#22).
  add constraint clients_email_normalized check (email = lower(btrim(email))),
  add constraint clients_guardian_email_normalized check (guardian_email = lower(btrim(guardian_email))),
  -- AC-HOLD-41: ім'я без пробілів по краях.
  add constraint clients_full_name_trimmed check (full_name = btrim(full_name)),
  -- AC-CARD-01, AC-CARD-02, AC-CARD-03: дорослий — email клієнта; дитина — ім'я та email опікуна, без власного email.
  add constraint clients_contact_by_type check (
    (client_type = 'adult' and email is not null and guardian_name is null and guardian_email is null)
    or (client_type = 'child' and email is null and guardian_name is not null and guardian_email is not null)
  );

comment on column public.clients.client_type is 'adult | child; картки зрізу 1 — adult.';
comment on column public.clients.birth_date is 'Не пізніше за сьогодні (America/Los_Angeles); null — лише картки зрізу 1.';
comment on column public.clients.session_language is 'English | Spanish; null — лише картки зрізу 1.';

-- AC-CARD-13: дублікат картки дитини — те саме ім'я (без регістру; крайові пробіли вже прибрано), дата народження
-- й email опікуна. Гонку двох однакових карток зупиняє сам індекс. Близнюки з різними іменами проходять;
-- email опікуна сам по собі не унікальний (#22). Дорослого охороняє наявний clients_email_lower_key (AC-HOLD-16, 34).
create unique index clients_child_identity_key
  on public.clients (lower(full_name), birth_date, guardian_email)
  where client_type = 'child';

-- ── Нова картка: дата народження й мова обов'язкові, дата — не пізніше за сьогодні ──
-- Тригер, а не constraint: картки зрізу 1 без цих полів лишаються дійсними, а «сьогодні» залежить від часу вставки.
create or replace function private.check_new_client_card()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- AC-CARD-12: дата народження порожня або пізніша за сьогодні в часовому поясі практики; мову не вибрано.
  -- Дата, що дорівнює сьогоднішній, коректна.
  if new.birth_date is null
     or new.birth_date > (now() at time zone 'America/Los_Angeles')::date
     or new.session_language is null then
    raise exception 'CLIENT_CARD_INVALID' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_new_client_card() from public, anon, authenticated;

create trigger clients_before_insert
  before insert on public.clients
  for each row execute function private.check_new_client_card();

-- ── Права (GRANT) ────────────────────────────────────────────────────────────
-- Колонковий grant: id, created_at — база, created_by — default auth.uid(). Update і delete для authenticated
-- не видаємо: у зрізі 2 картку не змінюють і не видаляють.
grant insert (full_name, email, client_type, birth_date, session_language, guardian_name, guardian_email)
  on table public.clients to authenticated;

-- ── RLS: створюють лише admin і scheduler (AC-CARD-06) ──────────────────────
-- Перестворюємо, щоб правило зрізу 2 жило в міграції зрізу 2 (і мутаційна перевірка мала що послабити тут).
drop policy clients_insert_staff on public.clients;
create policy clients_insert_staff
  on public.clients
  for insert
  to authenticated
  with check (
    (select private.is_staff())
    and created_by = (select auth.uid())
  );
