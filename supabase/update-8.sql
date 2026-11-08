-- ============================================================
-- QAREEB UPDATE 8: leads pipeline (run in Supabase > SQL Editor, after admin.sql)
-- Every student request becomes a "lead" with a status, an assigned staff member,
-- a follow-up date and a notes history. Who may see or change leads is controlled by
-- the staff switches "See student requests" and "Work on student requests".
-- ============================================================

-- 1) Lead fields on the requests table ---------------------------
alter table public.requests
  add column if not exists status      text not null default 'new',
  add column if not exists assigned_to text references public.staff(email) on update cascade on delete set null,
  add column if not exists follow_up   date,
  add column if not exists updated_at  timestamptz not null default now();

alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('new','contacted','viewing','reserved','rented','lost'));

create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_assigned_idx on public.requests (assigned_to);

-- Visitors (and the reserve_room() function) can never choose a status or an assignee:
-- every new request starts as "new" and unassigned.
create or replace function public.requests_start_clean()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.status := 'new'; new.assigned_to := null; new.follow_up := null; new.updated_at := now();
  return new;
end $$;
drop trigger if exists requests_start_clean on public.requests;
create trigger requests_start_clean before insert on public.requests for each row execute function public.requests_start_clean();

create or replace function public.requests_touch()
returns trigger language plpgsql
as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists requests_touch on public.requests;
create trigger requests_touch before update on public.requests for each row execute function public.requests_touch();

-- Staff with "work on requests" may change ONLY these three fields (never the student's name or number).
grant update (status, assigned_to, follow_up) on public.requests to authenticated;
drop policy if exists "staff works on requests" on public.requests;
create policy "staff works on requests" on public.requests for update to authenticated
  using (public.has_perm('leads_edit')) with check (public.has_perm('leads_edit'));

-- 2) Notes history ------------------------------------------------
create table if not exists public.lead_notes (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references public.requests(id) on delete cascade,
  author      text not null default '',
  body        text not null check (char_length(body) between 1 and 1000),
  system      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists lead_notes_request_idx on public.lead_notes (request_id, created_at);
alter table public.lead_notes enable row level security;
revoke all on public.lead_notes from anon;
grant select, insert on public.lead_notes to authenticated;

drop policy if exists "staff reads lead notes" on public.lead_notes;
create policy "staff reads lead notes" on public.lead_notes for select to authenticated
  using (public.has_perm('leads_view'));
drop policy if exists "staff adds lead notes" on public.lead_notes;
create policy "staff adds lead notes" on public.lead_notes for insert to authenticated
  with check (public.has_perm('leads_edit') and system = false and author = public.my_email());

-- Status, assignee and follow-up changes write themselves into the history.
create or replace function public.requests_log_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare who text := coalesce(public.my_email(), 'system');
begin
  if new.status is distinct from old.status then
    insert into public.lead_notes (request_id, author, body, system) values (new.id, who, 'Status: ' || old.status || ' -> ' || new.status, true);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.lead_notes (request_id, author, body, system) values (new.id, who, 'Assigned to ' || coalesce(new.assigned_to, 'nobody'), true);
  end if;
  if new.follow_up is distinct from old.follow_up then
    insert into public.lead_notes (request_id, author, body, system) values (new.id, who, 'Follow-up date: ' || coalesce(new.follow_up::text, 'cleared'), true);
  end if;
  return new;
end $$;
drop trigger if exists requests_log_change on public.requests;
create trigger requests_log_change after update on public.requests for each row execute function public.requests_log_change();

-- 3) Who can I assign a lead to? (names of active staff, for people who can see leads)
create or replace function public.staff_directory()
returns table (email text, name text)
language sql security definer set search_path = public stable
as $$
  select s.email, s.name from public.staff s
  where s.active and public.has_perm('leads_view')
  order by coalesce(nullif(s.name, ''), s.email)
$$;
revoke all on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;
