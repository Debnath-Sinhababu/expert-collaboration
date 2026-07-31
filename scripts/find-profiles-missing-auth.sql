-- Finds profile rows that cannot currently log in because their linked auth user
-- is missing, or because the profile has no user_id at all.
--
-- Run this in the Supabase SQL editor.

select
  'expert' as role,
  'experts' as table_name,
  e.id as profile_id,
  e.user_id,
  e.email,
  e.name,
  case
    when e.user_id is null then 'missing_user_id'
    when au.id is null then 'auth_user_missing'
    else 'ok'
  end as problem
from public.experts e
left join auth.users au on au.id = e.user_id
where e.email is not null
  and (e.user_id is null or au.id is null)

union all

select
  'institution' as role,
  'institutions' as table_name,
  i.id as profile_id,
  i.user_id,
  i.email,
  i.name,
  case
    when i.user_id is null then 'missing_user_id'
    when au.id is null then 'auth_user_missing'
    else 'ok'
  end as problem
from public.institutions i
left join auth.users au on au.id = i.user_id
where i.email is not null
  and (i.user_id is null or au.id is null)

union all

select
  'student' as role,
  'site_students' as table_name,
  s.id as profile_id,
  s.user_id,
  s.email,
  s.name,
  case
    when s.user_id is null then 'missing_user_id'
    when au.id is null then 'auth_user_missing'
    else 'ok'
  end as problem
from public.site_students s
left join auth.users au on au.id = s.user_id
where s.email is not null
  and (s.user_id is null or au.id is null)

order by role, email;
