-- ============================================================
-- QAREEB UPDATE 16: a profile photo for every team member (run in Supabase > SQL Editor, after update-15.sql)
-- Each person adds their own photo from the staff menu. It replaces the letter in the circle.
-- Only you can change your own photo. Until this is run, the staff area works as before.
-- ============================================================

-- 1) Where the photo address is kept -------------------------------
alter table public.staff add column if not exists avatar_url text;

-- 2) A public folder for the small photos (anyone with the link can see a photo, only the team can add one) ------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('staff-photos', 'staff-photos', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "team adds own photo" on storage.objects;
create policy "team adds own photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'staff-photos' and public.has_perm('any'));

-- 3) Read and change your own photo ---------------------------------
create or replace function public.my_avatar()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select s.avatar_url from public.staff s where s.email = public.my_email() and s.active
$$;
revoke all on function public.my_avatar() from public, anon;
grant execute on function public.my_avatar() to authenticated;

create or replace function public.set_my_avatar(p text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p is not null and (length(p) > 400 or p !~ '^https://[A-Za-z0-9.-]+/storage/v1/object/public/staff-photos/[A-Za-z0-9._-]+$') then
    return false;
  end if;
  update public.staff set avatar_url = p where email = public.my_email() and active;
  return found;
end
$$;
revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
