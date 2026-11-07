-- Статус перевірки страхування в картці клієнта (impl-insurance-status, задача 1: AC-INS-01).
-- Наявні картки зрізів 1–2 отримують 'not_set' через default (припущення PM, вимога #33).
-- Читання — наявний grant select і політики select на public.clients: колонку бачить той, кому видна картка.
-- Змінювати статус відкриває окрема міграція задачі 2 (client_insurance_update); grant insert не змінюємо.
-- Правила міграцій — у заголовку 20261012000000_profiles_and_roles.sql і в AGENTS.md → «База даних».

alter table public.clients
  add column insurance_status text not null default 'not_set'
    constraint clients_insurance_status_check
      check (insurance_status in ('not_set', 'verified', 'not_accepted', 'private_pay'));   -- AC-INS-01

comment on column public.clients.insurance_status is
  'not_set | verified | not_accepted | private_pay; нова картка — not_set. Тексти: src/lib/insurance.ts.';
