-- ============================================================
-- QAREEB UPDATE 12: named share links with counts (run in Supabase > SQL Editor, after update-11.sql)
-- A manager creates links such as  qareebkl.netlify.app/s/sara  for an agent, a WhatsApp group or a poster.
-- Each link can credit a staff member and can have its own WhatsApp number.
-- The Student page (share) shows for every link how many students opened it, looked at rooms and asked.
-- ============================================================

-- 1) The links -----------------------------------------------------
create table if not exists public.share_links (
  id           bigint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,29}$' and slug !~ '^[0-9a-f]{6}$'),
  name         text not null check (char_length(trim(name)) between 1 and 80),
  agent_email  text references public.staff(email) on update cascade on delete set null,
  whatsapp     text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   text not null default ''
);
alter table public.share_links enable row level security;
revoke all on public.share_links from anon;
grant select, insert, update on public.share_links to authenticated;

drop policy if exists "staff read links" on public.share_links;
create policy "staff read links" on public.share_links for select to authenticated using (public.has_perm('any'));
drop policy if exists "managers add links" on public.share_links;
create policy "managers add links" on public.share_links for insert to authenticated with check (public.has_perm('site_edit'));
drop policy if exists "managers edit links" on public.share_links;
create policy "managers edit links" on public.share_links for update to authenticated
  using (public.has_perm('site_edit')) with check (public.has_perm('site_edit'));

create or replace function public.share_links_stamp()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.slug := lower(new.slug); new.created_by := coalesce(public.my_email(), ''); return new; end $$;
drop trigger if exists share_links_stamp on public.share_links;
create trigger share_links_stamp before insert on public.share_links for each row execute function public.share_links_stamp();

drop trigger if exists log_share_links on public.share_links;
create trigger log_share_links after insert or update or delete on public.share_links for each row execute function public.log_activity();

-- 2) Counting visits ------------------------------------------------
create table if not exists public.link_events (
  id     bigint generated always as identity primary key,
  slug   text not null,
  event  text not null check (event in ('open', 'look')),
  at     timestamptz not null default now()
);
create index if not exists link_events_slug_idx on public.link_events (slug, at desc);
alter table public.link_events enable row level security;
revoke all on public.link_events from anon;
grant select on public.link_events to authenticated;
drop policy if exists "staff read link events" on public.link_events;
create policy "staff read link events" on public.link_events for select to authenticated using (public.has_perm('leads_view'));
-- nobody writes to it directly: the website calls link_visit() below.

-- The website calls this when a student arrives through a link ('open'), looks at rooms ('look'),
-- or just needs to know the link's WhatsApp number ('info', which counts nothing).
create or replace function public.link_visit(p_slug text, p_event text default 'info')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare l public.share_links;
begin
  select * into l from public.share_links where slug = lower(trim(coalesce(p_slug, ''))) and active;
  if not found then return jsonb_build_object('ok', false); end if;
  if p_event in ('open', 'look') then insert into public.link_events (slug, event) values (l.slug, p_event); end if;
  return jsonb_build_object('ok', true, 'whatsapp', l.whatsapp);
end $$;
revoke all on function public.link_visit(text, text) from public;
grant execute on function public.link_visit(text, text) to anon, authenticated;

-- 3) Leads remember which link they came from -------------------------
alter table public.requests add column if not exists link_slug text;
create index if not exists requests_link_idx on public.requests (link_slug);

create or replace function public.requests_start_clean()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.status := 'new'; new.follow_up := null; new.updated_at := now();
  new.assigned_to := null; new.referred_by := null; new.link_slug := null;
  new.ref := nullif(lower(trim(coalesce(new.ref, ''))), '');
  if new.ref is not null then
    -- a staff member's personal code ...
    select s.email into new.referred_by from public.staff s where s.ref_code = new.ref and s.active;
    -- ... or a named link (which may credit a staff member)
    if new.referred_by is null then
      select l.slug into new.link_slug from public.share_links l where l.slug = new.ref and l.active;
      if new.link_slug is not null then
        select s.email into new.referred_by from public.share_links l join public.staff s on s.email = l.agent_email and s.active where l.slug = new.link_slug;
      end if;
    end if;
    new.assigned_to := new.referred_by;
  end if;
  return new;
end $$;

-- Codes may now contain a dash and be up to 30 characters (link names).
drop policy if exists "public can send a request" on public.requests;
create policy "public can send a request" on public.requests
  for insert to anon, authenticated
  with check (
    length(trim(name)) between 1 and 100
    and length(trim(whatsapp)) between 6 and 25
    and (note is null or length(note) <= 500)
    and kind in ('ask', 'tour')
    and (ref is null or ref ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,29}$')
  );

drop function if exists public.reserve_room(bigint, text, text, text, text);
create or replace function public.reserve_room(p_listing_id bigint, p_name text, p_whatsapp text, p_center text default null, p_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.listings;
  held int;
  until_ts timestamptz := now() + interval '24 hours';
begin
  if not (length(trim(coalesce(p_name, ''))) between 1 and 100)
     or not (length(trim(coalesce(p_whatsapp, ''))) between 6 and 25) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select count(*) into held
  from public.requests r join public.listings x on x.id = r.listing_id
  where r.kind = 'reserve' and r.whatsapp = trim(p_whatsapp)
    and x.status = 'reserved' and x.reserved_until > now();
  if held >= 2 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;

  select * into l from public.listings where id = p_listing_id and published for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if not (l.v_video and l.v_owner) then
    return jsonb_build_object('ok', false, 'reason', 'not_verified');
  end if;
  if not (l.status = 'available' or (l.status = 'reserved' and l.reserved_until is not null and l.reserved_until < now())) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  update public.listings set status = 'reserved', reserved_until = until_ts where id = l.id;
  insert into public.requests (listing_id, name, whatsapp, center, kind, ref)
  values (l.id, trim(p_name), trim(p_whatsapp), left(p_center, 40), 'reserve', left(regexp_replace(coalesce(p_ref, ''), '[^A-Za-z0-9-]', '', 'g'), 30));

  return jsonb_build_object('ok', true, 'until', until_ts);
end;
$$;

revoke all on function public.reserve_room(bigint, text, text, text, text) from public;
grant execute on function public.reserve_room(bigint, text, text, text, text) to anon, authenticated;
