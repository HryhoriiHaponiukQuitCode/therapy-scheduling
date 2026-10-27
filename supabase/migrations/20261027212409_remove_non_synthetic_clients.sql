-- Лише синтетичні дані (AGENTS.md, «База даних»): видаляємо картки клієнтів, чий контакт — email клієнта чи email
-- опікуна — не на домені example.test. На проді на 2026-10-27 таких дві (створені вручну з адресами на gmail.com);
-- адреси свідомо не пишемо в репозиторій, тож умова — за правилом, а не за конкретними email.
-- Ризик: деструктивна зміна даних. Разом із картками каскадом (holds.client_id on delete cascade) видаляються їхні
-- утримання й сеанси. Картки без жодного email не зачіпаються. Синтетичні картки (*@example.test) лишаються.

delete from public.clients
where (email is not null and lower(email) not like '%@example.test')
   or (guardian_email is not null and lower(guardian_email) not like '%@example.test');
