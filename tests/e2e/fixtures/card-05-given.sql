-- «Дано» AC-CARD-05 для e2e у CI (.github/workflows/e2e.yml): лише на одноразовому локальному Supabase в раннері,
-- ніколи на проді. client9 — свій клієнт лише для therapist2: картка Client Nine і підтверджений сеанс therapist2
-- («Confirmed» робить клієнта своїм без обмеження в часі, AC-CARD-14). Ідемпотентно: повторний запуск нічого не дублює.
-- На проді те саме «Дано» створено один раз через інтерфейс від scheduler1 (див. docs/qa/proof-pack.md, розділ C).
insert into public.clients (client_type, full_name, birth_date, session_language, email)
select 'adult', 'Client Nine', '1987-06-21', 'English', 'client9@example.test'
where not exists (select 1 from public.clients where email = 'client9@example.test');

insert into public.holds (therapist_id, slot_start, client_id, confirmed_at)
select p.id, date_trunc('hour', now()) + interval '7 days', c.id, now()
from public.profiles as p
cross join public.clients as c
where p.email = 'therapist2@example.test'
  and c.email = 'client9@example.test'
  and not exists (select 1 from public.holds as h where h.client_id = c.id);
