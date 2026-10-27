-- Користувач без ролі (impl-client-cards, задача 1: AC-CARD-11).
-- Новий користувач Auth отримує профіль без ролі й бачить лише «Your account has no access yet. Contact an
-- administrator.»; роль ставить лише service_role (scripts/create-demo-users.mjs). Порядок — drop-first, як у
-- заголовку 20261012000000_profiles_and_roles.sql.

alter table public.profiles drop constraint profiles_role_check;               -- 1) зняти старе правило
alter table public.profiles alter column role drop not null;                   --    роль може бути відсутня…
-- 2) наявні дані: до цієї міграції тригер давав кожному новому користувачу Auth default 'therapist'. Справжній
-- терапевт практики має доступність (therapist_availability — сид за email); профіль 'therapist' без неї отримав
-- роль лише за замовчуванням — тепер у нього ролі немає (AC-CARD-11). Ризик: якщо такому акаунту роль давали
-- свідомо, її повертає service_role (npm run users:demo або Dashboard).
update public.profiles as p
set role = null
where p.role = 'therapist'
  and not exists (
    select 1 from public.therapist_availability as a where lower(a.therapist_email) = lower(p.email)
  );
alter table public.profiles alter column role drop default;                    -- 3) тригер on_auth_user_created її не ставить
alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('admin', 'scheduler', 'therapist'));        -- 4) нове правило

comment on column public.profiles.role is
  'Роль у застосунку; null — користувач увійшов, але доступу ще не має (AC-CARD-11). Змінює лише service_role.';

-- Права не змінюються: authenticated оновлює лише full_name власного профілю (grant update (full_name)),
-- тож роль собі не поставить ніхто. private.is_staff() для null повертає false, private.current_app_role() — null.
