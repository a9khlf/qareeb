-- ============================================================
-- QAREEB UPDATE 9: owners directory + change history (run in Supabase > SQL Editor, after update-8.sql)
-- 1) A list of room owners (landlords) and which rooms are theirs.
-- 2) A history of who changed what (rooms, language centers, owners, staff). Owners of the project can read it.
-- ============================================================

-- 1) Owners directory --------------------------------------------
create table if not exists public.owners (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(trim(name)) between 1 and 100),
  phone       text not null default '' check (char_length(phone) <= 40),
  notes       text not null default '' check (char_length(notes) <= 2000),
  id_checked  boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.owners enable row level security;
revoke all on public.owners from anon;
grant select, insert, update, delete on public.owners to authenticated;

drop policy if exists "staff reads owners" on public.owners;
create policy "staff reads owners" on public.owners for select to authenticated
  using (public.has_perm('rooms_edit') or public.has_perm('leads_view'));
drop policy if exists "staff adds owners" on public.owners;
create policy "staff adds owners" on public.owners for insert to authenticated
  with check (public.has_perm('rooms_edit'));
drop policy if exists "staff edits owners" on public.owners;
create policy "staff edits owners" on public.owners for update to authenticated
  using (public.has_perm('rooms_edit')) with check (public.has_perm('rooms_edit'));
drop policy if exists "staff deletes owners" on public.owners;
create policy "staff deletes owners" on public.owners for delete to authenticated
  using (public.has_perm('rooms_delete'));

alter table public.listings add column if not exists owner_id bigint references public.owners(id) on delete set null;
create index if not exists listings_owner_idx on public.listings (owner_id);

-- 2) Change history ----------------------------------------------
create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      text not null default '',
  action     text not null,                 -- insert / update / delete
  entity     text not null,                 -- listings / centers / owners / staff
  entity_id  text not null default '',
  label      text not null default '',
  summary    text not null default ''
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);
alter table public.activity_log enable row level security;
revoke all on public.activity_log from anon;
grant select on public.activity_log to authenticated;
drop policy if exists "owner reads history" on public.activity_log;
create policy "owner reads history" on public.activity_log for select to authenticated
  using (public.has_perm('owner'));
-- no insert/update/delete policies: only the triggers below write to it, and nobody can edit it.

-- Short text of what changed between two versions of a row.
create or replace function public.diff_summary(a_old jsonb, a_new jsonb)
returns text language sql immutable
as $$
  select coalesce(string_agg(
    case when length(coalesce(nv.value::text, '')) <= 40 and length(coalesce(ov.value::text, '')) <= 40
      then nv.key || ': ' || trim(both '"' from coalesce(ov.value::text, 'null')) || ' -> ' || trim(both '"' from coalesce(nv.value::text, 'null'))
      else nv.key end, '; ' order by nv.key), '')
  from jsonb_each(a_new) nv join jsonb_each(a_old) ov on ov.key = nv.key
  where nv.value is distinct from ov.value and nv.key not in ('updated_at', 'reserved_until', 'created_at')
$$;

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
          coalesce(rec->>'title_en', rec->>'name_en', nullif(rec->>'name', ''), rec->>'email', ''), summ);
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists log_listings on public.listings;
create trigger log_listings after insert or update or delete on public.listings for each row execute function public.log_activity();
drop trigger if exists log_centers on public.centers;
create trigger log_centers  after insert or update or delete on public.centers  for each row execute function public.log_activity();
drop trigger if exists log_owners on public.owners;
create trigger log_owners   after insert or update or delete on public.owners   for each row execute function public.log_activity();
drop trigger if exists log_staff on public.staff;
create trigger log_staff    after insert or update or delete on public.staff    for each row execute function public.log_activity();
