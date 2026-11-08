-- ============================================================
-- QAREEB UPDATE 14: team announcements with read receipts (run in Supabase > SQL Editor, after update-13.sql)
-- Someone with the new switch "Post announcements to the team" writes a message. Every team member sees it at the
-- top of the staff area until they press "Got it". The people who post can see who has read it and who has not.
-- ============================================================

-- 1) The switch ----------------------------------------------------
alter table public.staff add column if not exists announce boolean not null default false;
update public.staff set announce = true where role = 'manager';

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
        when 'announce'     then s.announce
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
    'announce',     s.role = 'owner' or s.announce,
    'staff_manage', s.role = 'owner')
  from public.staff s where s.email = public.my_email() and s.active
$$;

-- 2) Announcements and who read them ------------------------------------
create table if not exists public.announcements (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(trim(title)) between 1 and 120),
  body        text not null check (char_length(trim(body)) between 1 and 2000),
  active      boolean not null default true,
  created_by  text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon;
grant select, insert, update on public.announcements to authenticated;

drop policy if exists "team reads announcements" on public.announcements;
create policy "team reads announcements" on public.announcements for select to authenticated
  using (public.has_perm('any') and (active or public.has_perm('announce')));
drop policy if exists "posters add announcements" on public.announcements;
create policy "posters add announcements" on public.announcements for insert to authenticated
  with check (public.has_perm('announce'));
drop policy if exists "posters edit announcements" on public.announcements;
create policy "posters edit announcements" on public.announcements for update to authenticated
  using (public.has_perm('announce')) with check (public.has_perm('announce'));

create or replace function public.announcements_stamp()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.created_by := coalesce(public.my_email(), ''); return new; end $$;
drop trigger if exists announcements_stamp on public.announcements;
create trigger announcements_stamp before insert on public.announcements for each row execute function public.announcements_stamp();

create table if not exists public.announcement_reads (
  announcement_id  bigint not null references public.announcements(id) on delete cascade,
  staff_email      text not null,
  read_at          timestamptz not null default now(),
  primary key (announcement_id, staff_email)
);
alter table public.announcement_reads enable row level security;
revoke all on public.announcement_reads from anon;
grant select on public.announcement_reads to authenticated;
drop policy if exists "read receipts" on public.announcement_reads;
create policy "read receipts" on public.announcement_reads for select to authenticated
  using (public.has_perm('announce') or staff_email = public.my_email());
-- nobody writes receipts directly: "Got it" calls ack_announcement() below, which can only record the caller's own read.

create or replace function public.ack_announcement(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare me text := public.my_email();
begin
  if me is null or not public.has_perm('any') then return false; end if;
  insert into public.announcement_reads (announcement_id, staff_email)
  select a.id, me from public.announcements a where a.id = p_id and a.active
  on conflict do nothing;
  return true;
end $$;
revoke all on function public.ack_announcement(bigint) from public, anon;
grant execute on function public.ack_announcement(bigint) to authenticated;

-- Names of the active team (for "read by" lists and for showing who posted).
create or replace function public.team_names()
returns table (email text, name text)
language sql
security definer
set search_path = public
stable
as $$
  select s.email, s.name from public.staff s
  where s.active and s.left_at is null and public.has_perm('any')
  order by coalesce(nullif(s.name, ''), s.email)
$$;
revoke all on function public.team_names() from public, anon;
grant execute on function public.team_names() to authenticated;

-- 3) History ----------------------------------------------------------
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  who  text := coalesce(public.my_email(), 'website');
  rec  jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  summ text := '';
begin
  if tg_op = 'UPDATE' then
    summ := public.diff_summary(to_jsonb(old), to_jsonb(new));
    if summ = '' then return new; end if;
  end if;
  insert into public.activity_log (actor, action, entity, entity_id, label, summary)
  values (who, lower(tg_op), tg_table_name, coalesce(rec->>'id', rec->>'email', ''),
          coalesce(rec->>'title_en', rec->>'name_en', nullif(rec->>'name', ''), rec->>'title', rec->>'email', ''), summ);
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists log_announcements on public.announcements;
create trigger log_announcements after insert or update on public.announcements for each row execute function public.log_activity();
