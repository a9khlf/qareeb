-- ============================================================
-- QAREEB STAFF + ACCESS SETUP
-- Run AFTER schema.sql, update-1.sql ... update-7.sql (including update-3.sql).
--
-- Who can use the admin page?  Only people listed in the "staff" table.
-- Each person has a ROLE (Owner, Manager, Data entry, Sales or support, Viewer)
-- and a few ON/OFF switches. The database checks them on every single row,
-- so hiding a button is never the only protection.
--
-- STEPS
-- 1. Supabase > Authentication > Users > Add user > "Create new user".
--    Use YOUR email and a strong password. Tick "Auto Confirm User".
-- 2. Replace YOUR_ADMIN_EMAIL at the very bottom with that same email
--    (in the SQL Editor only, do not save your email in the project files).
-- 3. Run this whole file in the SQL Editor.
-- 4. Supabase > Authentication > Sign In / Providers > Email:
--    keep "Confirm email" switched ON. (Staff create their own account from the
--    admin page; access is given only after their email is confirmed.)
-- ============================================================

-- 1) Staff list -----------------------------------------------
create table if not exists public.staff (
  email         text primary key check (email = lower(email)),
  name          text not null default '',
  role          text not null default 'viewer' check (role in ('owner','manager','data_entry','sales','viewer')),
  active        boolean not null default true,
  rooms_edit    boolean not null default false,   -- add / edit rooms, photos, status
  rooms_delete  boolean not null default false,   -- delete rooms
  centers_edit  boolean not null default false,   -- add / edit language centers
  leads_view    boolean not null default false,   -- see student requests and phone numbers
  leads_edit    boolean not null default false,   -- work on / delete requests
  created_at    timestamptz not null default now()
);
alter table public.staff enable row level security;
revoke all on public.staff from anon;

-- The email of the signed-in user, but ONLY if that email was confirmed.
create or replace function public.my_email()
returns text
language sql
security definer
set search_path = public, auth
stable
as $$ select lower(u.email) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null $$;

-- Does the signed-in person have this permission?  ('any' = is active staff, 'owner' = is an owner)
create or replace function public.has_perm(p text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select s.active and (s.role = 'owner' or case p
        when 'any'          then true
        when 'rooms_edit'   then s.rooms_edit
        when 'rooms_delete' then s.rooms_delete
        when 'centers_edit' then s.centers_edit
        when 'leads_view'   then s.leads_view
        when 'leads_edit'   then s.leads_edit and s.leads_view
        else false end)
    from public.staff s where s.email = public.my_email()
  ), false)
$$;

-- What the admin page asks after login: who am I and what may I do?  (null = not staff)
create or replace function public.my_access()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'email', s.email, 'name', s.name, 'role', s.role,
    'rooms_edit',   s.role = 'owner' or s.rooms_edit,
    'rooms_delete', s.role = 'owner' or s.rooms_delete,
    'centers_edit', s.role = 'owner' or s.centers_edit,
    'leads_view',   s.role = 'owner' or s.leads_view,
    'leads_edit',   s.role = 'owner' or (s.leads_edit and s.leads_view),
    'staff_manage', s.role = 'owner')
  from public.staff s where s.email = public.my_email() and s.active
$$;

revoke all on function public.my_email()      from public, anon;
revoke all on function public.has_perm(text)  from public, anon;
revoke all on function public.my_access()     from public, anon;
grant execute on function public.my_email()     to authenticated;
grant execute on function public.has_perm(text) to authenticated;
grant execute on function public.my_access()    to authenticated;

-- Only owners can see or change the staff list.
grant select, insert, update, delete on public.staff to authenticated;
create policy "owner reads staff"   on public.staff for select to authenticated using (public.has_perm('owner'));
create policy "owner adds staff"    on public.staff for insert to authenticated with check (public.has_perm('owner'));
create policy "owner edits staff"   on public.staff for update to authenticated using (public.has_perm('owner')) with check (public.has_perm('owner'));
create policy "owner removes staff" on public.staff for delete to authenticated using (public.has_perm('owner'));

-- There must always be one active owner (so nobody can lock the project by accident).
create or replace function public.keep_one_owner()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'owner' and old.active and (tg_op = 'DELETE' or new.role <> 'owner' or not new.active or new.email <> old.email) then
    if not exists (select 1 from public.staff where role = 'owner' and active and email <> old.email) then
      raise exception 'There must always be at least one active owner.';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;
drop trigger if exists staff_keep_owner on public.staff;
create trigger staff_keep_owner before update or delete on public.staff for each row execute function public.keep_one_owner();

-- 2) What staff may do on the site data ------------------------
grant select, insert, update, delete on public.listings to authenticated;
grant insert, update, delete        on public.centers  to authenticated;
grant select, delete                on public.requests to authenticated;
grant usage, select on sequence public.listings_id_seq to authenticated;

create policy "staff reads all listings"  on public.listings for select to authenticated using (public.has_perm('any'));
create policy "staff adds listings"       on public.listings for insert to authenticated with check (public.has_perm('rooms_edit'));
create policy "staff edits listings"      on public.listings for update to authenticated using (public.has_perm('rooms_edit')) with check (public.has_perm('rooms_edit'));
create policy "staff deletes listings"    on public.listings for delete to authenticated using (public.has_perm('rooms_delete'));

create policy "staff adds centers"        on public.centers  for insert to authenticated with check (public.has_perm('centers_edit'));
create policy "staff edits centers"       on public.centers  for update to authenticated using (public.has_perm('centers_edit')) with check (public.has_perm('centers_edit'));
create policy "staff deletes centers"     on public.centers  for delete to authenticated using (public.has_perm('centers_edit'));

-- Student requests contain names and phone numbers: only people with the switch can see them.
create policy "staff reads requests"      on public.requests for select to authenticated using (public.has_perm('leads_view'));
create policy "staff deletes requests"    on public.requests for delete to authenticated using (public.has_perm('leads_edit'));

-- Centers students looked for but are not listed yet (table is created in update-2.sql)
grant select, delete on public.center_requests to authenticated;
create policy "staff reads center suggestions"   on public.center_requests for select to authenticated using (public.has_perm('centers_edit'));
create policy "staff deletes center suggestions" on public.center_requests for delete to authenticated using (public.has_perm('centers_edit'));

-- 3) Photo and video storage ----------------------------------
-- Public buckets: anyone can VIEW a file if they have its link.
-- Only staff with the right switch can upload, replace or delete files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('room-photos', 'room-photos', true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('room-videos', 'room-videos', true, 52428800, array['video/mp4','video/webm']),
  ('center-logos', 'center-logos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "staff uploads media" on storage.objects for insert to authenticated
  with check ((bucket_id in ('room-photos','room-videos') and public.has_perm('rooms_edit'))
           or (bucket_id = 'center-logos' and public.has_perm('centers_edit')));
create policy "staff lists media" on storage.objects for select to authenticated
  using ((bucket_id in ('room-photos','room-videos') and public.has_perm('any'))
      or (bucket_id = 'center-logos' and public.has_perm('any')));
create policy "staff replaces media" on storage.objects for update to authenticated
  using ((bucket_id in ('room-photos','room-videos') and public.has_perm('rooms_edit'))
      or (bucket_id = 'center-logos' and public.has_perm('centers_edit')));
create policy "staff deletes media" on storage.objects for delete to authenticated
  using ((bucket_id in ('room-photos','room-videos') and public.has_perm('rooms_edit'))
      or (bucket_id = 'center-logos' and public.has_perm('centers_edit')));

-- 4) Make yourself the owner -----------------------------------
-- Replace YOUR_ADMIN_EMAIL with the email you used in step 1.
insert into public.staff (email, name, role, active)
values (lower('YOUR_ADMIN_EMAIL'), 'Owner', 'owner', true)
on conflict (email) do nothing;
