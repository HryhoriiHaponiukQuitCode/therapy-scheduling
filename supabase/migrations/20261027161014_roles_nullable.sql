-- Користувач без ролі (impl-client-cards, задача 1: AC-CARD-11).
-- Новий користувач Auth отримує профіль без ролі й бачить лише «Your account has no access yet. Contact an
-- administrator.»; роль ставить лише service_role (scripts/create-demo-users.mjs). Порядок — drop-first, як у
-- заголовку 20261012000000_profiles_and_roles.sql.

alter table public.profiles drop constraint profiles_role_check;               -- 1) зняти старе правило
-- 2) наявні дані: усі профілі вже мають роль admin / scheduler / therapist — оновлювати нічого.
alter table public.profiles alter column role drop not null;                   -- 3) роль може бути відсутня…
alter table public.profiles alter column role drop default;                    --    …і тригер on_auth_user_created її не ставить
alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('admin', 'scheduler', 'therapist'));        -- 4) нове правило

comment on column public.profiles.role is
  'Роль у застосунку; null — користувач увійшов, але доступу ще не має (AC-CARD-11). Змінює лише service_role.';

-- Права не змінюються: authenticated оновлює лише full_name власного профілю (grant update (full_name)),
-- тож роль собі не поставить ніхто. private.is_staff() для null повертає false, private.current_app_role() — null.
