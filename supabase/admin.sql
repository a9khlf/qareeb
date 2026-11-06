-- ============================================================
-- QAREEB ADMIN SETUP (run AFTER schema.sql)
--
-- Who can edit the site?  Only users listed in the "admins" table.
-- Everyone else (including anyone who signs up) can still only do what
-- schema.sql allows: read published rooms and send a request.
--
-- STEPS
-- 1. Supabase > Authentication > Users > Add user > "Create new user".
--    Use YOUR email and a strong password. Tick "Auto Confirm User".
-- 2. Replace YOUR_ADMIN_EMAIL at the very bottom with that same email.
-- 3. Run this whole file in the SQL Editor.
-- 4. Authentication > Sign In / Providers: switch OFF "Allow new users to sign up".
-- ============================================================

-- 1) Admin list -----------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;   -- no policies: not readable through the API

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) What admins may do ---------------------------------------
-- (Row Level Security still checks is_admin() on every single row.)
grant select, insert, update, delete on public.listings to authenticated;
grant insert, update, delete        on public.centers  to authenticated;
grant select, delete                on public.requests to authenticated;
grant usage, select on sequence public.listings_id_seq to authenticated;

create policy "admin reads all listings"  on public.listings for select to authenticated using (public.is_admin());
create policy "admin adds listings"       on public.listings for insert to authenticated with check (public.is_admin());
create policy "admin edits listings"      on public.listings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes listings"    on public.listings for delete to authenticated using (public.is_admin());

create policy "admin adds centers"        on public.centers  for insert to authenticated with check (public.is_admin());
create policy "admin edits centers"       on public.centers  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes centers"     on public.centers  for delete to authenticated using (public.is_admin());

create policy "admin reads requests"      on public.requests for select to authenticated using (public.is_admin());
create policy "admin deletes requests"    on public.requests for delete to authenticated using (public.is_admin());

-- 3) Photo and video storage ----------------------------------
-- Public buckets: anyone can VIEW a file if they have its link.
-- Only admins can upload, replace or delete files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('room-photos', 'room-photos', true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('room-videos', 'room-videos', true, 52428800, array['video/mp4','video/webm'])
on conflict (id) do nothing;

create policy "admin uploads media" on storage.objects for insert to authenticated
  with check (bucket_id in ('room-photos','room-videos') and public.is_admin());
create policy "admin lists media" on storage.objects for select to authenticated
  using (bucket_id in ('room-photos','room-videos') and public.is_admin());
create policy "admin replaces media" on storage.objects for update to authenticated
  using (bucket_id in ('room-photos','room-videos') and public.is_admin());
create policy "admin deletes media" on storage.objects for delete to authenticated
  using (bucket_id in ('room-photos','room-videos') and public.is_admin());

-- 4) Make yourself an admin -----------------------------------
-- Replace YOUR_ADMIN_EMAIL with the email you used in step 1.
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
on conflict do nothing;
