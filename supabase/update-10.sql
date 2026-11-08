-- ============================================================
-- QAREEB UPDATE 10: personal links per staff member (run in Supabase > SQL Editor, after update-9.sql)
-- Each staff member gets a short personal code. A student who opens the site through
-- ...?ref=<code> and then asks about a room, requests a video tour or reserves,
-- creates a lead that is credited to that staff member and starts out assigned to them.
-- ============================================================

-- 1) A personal code for every staff member ----------------------
alter table public.staff add column if not exists ref_code text;

create or replace function public.make_ref_code()
returns text language plpgsql
as $$
declare c text;
begin
  loop
    c := substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    exit when not exists (select 1 from public.staff where ref_code = c);
  end loop;
  return c;
end $$;

update public.staff set ref_code = public.make_ref_code() where ref_code is null;
create unique index if not exists staff_ref_code_key on public.staff (ref_code);

create or replace function public.staff_default_ref_code()
returns trigger language plpgsql
as $$
begin
  if new.ref_code is null or new.ref_code = '' then new.ref_code := public.make_ref_code(); end if;
  new.ref_code := lower(new.ref_code);
  return new;
end $$;
drop trigger if exists staff_default_ref_code on public.staff;
create trigger staff_default_ref_code before insert on public.staff for each row execute function public.staff_default_ref_code();

-- The admin page asks "who am I and what may I do?"; it now also gets my personal code.
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
    'staff_manage', s.role = 'owner')
  from public.staff s where s.email = public.my_email() and s.active
$$;

-- 2) Credit on every lead ----------------------------------------
alter table public.requests
  add column if not exists ref         text,
  add column if not exists referred_by text references public.staff(email) on update cascade on delete set null;
create index if not exists requests_referred_idx on public.requests (referred_by);

-- A new request is always "new". If it came through a staff member's personal link, that person
-- gets the credit AND the lead starts assigned to them. Visitors cannot choose any of this directly.
create or replace function public.requests_start_clean()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.status := 'new'; new.follow_up := null; new.updated_at := now();
  new.assigned_to := null; new.referred_by := null;
  new.ref := nullif(lower(trim(coalesce(new.ref, ''))), '');
  if new.ref is not null then
    select s.email into new.referred_by from public.staff s where s.ref_code = new.ref and s.active;
    new.assigned_to := new.referred_by;
  end if;
  return new;
end $$;

-- Visitors may send a short code, nothing else about credit.
drop policy if exists "public can send a request" on public.requests;
create policy "public can send a request" on public.requests
  for insert to anon, authenticated
  with check (
    length(trim(name)) between 1 and 100
    and length(trim(whatsapp)) between 6 and 25
    and (note is null or length(note) <= 500)
    and kind in ('ask', 'tour')
    and (ref is null or ref ~ '^[A-Za-z0-9]{1,20}$')
  );

-- 3) Reserve now carries the code too ------------------------------
drop function if exists public.reserve_room(bigint, text, text, text);
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

  -- one phone number cannot hold more than 2 rooms at the same time
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
  values (l.id, trim(p_name), trim(p_whatsapp), left(p_center, 40), 'reserve', left(regexp_replace(coalesce(p_ref, ''), '[^A-Za-z0-9]', '', 'g'), 20));

  return jsonb_build_object('ok', true, 'until', until_ts);
end;
$$;

revoke all on function public.reserve_room(bigint, text, text, text, text) from public;
grant execute on function public.reserve_room(bigint, text, text, text, text) to anon, authenticated;
