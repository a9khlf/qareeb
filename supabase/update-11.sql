-- ============================================================
-- QAREEB UPDATE 11: edit the website from the staff area (run in Supabase > SQL Editor, after update-10.sql)
-- 1) A new staff switch "Edit the website text and WhatsApp number" (owners always have it; managers get it by default).
-- 2) One settings row holding the WhatsApp number and any wording staff changed. Everyone can READ it
--    (it is what the public site shows anyway); only people with the switch can change it.
-- ============================================================

-- 1) The switch ----------------------------------------------------
alter table public.staff add column if not exists site_edit boolean not null default false;
update public.staff set site_edit = true where role = 'manager';

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
        when 'site_edit'    then s.site_edit
        else false end)
    from public.staff s where s.email = public.my_email()
  ), false)
$$;

create or replace function public.my_access()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'email', s.email, 'name', s.name, 'role', s.role, 'ref_code', s.ref_code,
    'rooms_edit',   s.role = 'owner' or s.rooms_edit,
    'rooms_delete', s.role = 'owner' or s.rooms_delete,
    'centers_edit', s.role = 'owner' or s.centers_edit,
    'leads_view',   s.role = 'owner' or s.leads_view,
    'leads_edit',   s.role = 'owner' or (s.leads_edit and s.leads_view),
    'site_edit',    s.role = 'owner' or s.site_edit,
    'staff_manage', s.role = 'owner')
  from public.staff s where s.email = public.my_email() and s.active
$$;

-- 2) The settings row ------------------------------------------------
create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  name        text not null default 'Website text and WhatsApp number',
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 20000),
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant update (data) on public.site_settings to authenticated;

drop policy if exists "everyone reads site settings" on public.site_settings;
create policy "everyone reads site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "staff edit site settings" on public.site_settings;
create policy "staff edit site settings" on public.site_settings for update to authenticated
  using (public.has_perm('site_edit')) with check (public.has_perm('site_edit'));
-- no insert or delete: there is exactly one row.

create or replace function public.site_settings_touch()
returns trigger language plpgsql
as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings for each row execute function public.site_settings_touch();

-- Changes appear in the History tab.
drop trigger if exists log_site_settings on public.site_settings;
create trigger log_site_settings after update on public.site_settings for each row execute function public.log_activity();
