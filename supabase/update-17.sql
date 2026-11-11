-- ============================================================
-- QAREEB UPDATE 17: "My profile" page for every team member (run in Supabase > SQL Editor, after update-16.sql)
-- Everyone can change their own name, and everyone on the team can see their colleagues' names, roles and photos.
-- Until this is run, the page still opens; colleagues show by name only and "Save name" says it could not save.
-- ============================================================

-- Change my own name (nobody else's)
create or replace function public.set_my_name(p text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p is null or char_length(trim(p)) not between 1 and 60 then return false; end if;
  update public.staff set name = trim(p) where email = public.my_email() and active;
  return found;
end
$$;
revoke all on function public.set_my_name(text) from public, anon;
grant execute on function public.set_my_name(text) to authenticated;

-- The active team with photos, for the team list on the profile page
create or replace function public.team_profiles()
returns table (email text, name text, role text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select s.email, s.name, s.role, s.avatar_url from public.staff s
  where s.active and s.left_at is null and public.has_perm('any')
  order by case when s.role = 'owner' then 0 else 1 end, coalesce(nullif(s.name, ''), s.email)
$$;
revoke all on function public.team_profiles() from public, anon;
grant execute on function public.team_profiles() to authenticated;
