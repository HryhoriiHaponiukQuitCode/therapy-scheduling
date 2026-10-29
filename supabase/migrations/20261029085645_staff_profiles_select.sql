-- Профілі персоналу для списків вибору (терапевти на /slots, розбивка на головній): одна політика читання замість
-- окремої умови для кожної сторінки. Колонки й grant без змін (select на profiles уже є з 20261012000000).
drop policy profiles_select_therapists_for_staff on public.profiles;

create policy profiles_select_therapists_for_staff
  on public.profiles
  for select
  to authenticated
  using (role in ('therapist', 'scheduler', 'admin'));
