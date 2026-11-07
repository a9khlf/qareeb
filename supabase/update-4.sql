-- ============================================================
-- QAREEB UPDATE 4: "Reserve now" (run in Supabase > SQL Editor)
--
-- A student can hold a room for 24 hours, but ONLY if the room is
--   * published and currently available (or its old hold has expired), and
--   * verified (live video tour + owner identity checked).
-- Visitors cannot edit rooms directly; they can only call this one function.
-- The owner then confirms on WhatsApp, collects the deposit, and marks the room Rented in admin.
-- ============================================================

alter table public.listings add column if not exists reserved_until timestamptz;
alter table public.requests add column if not exists kind text not null default 'ask' check (kind in ('ask','reserve'));

create or replace function public.reserve_room(p_listing_id bigint, p_name text, p_whatsapp text, p_center text default null)
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
  insert into public.requests (listing_id, name, whatsapp, center, kind)
  values (l.id, trim(p_name), trim(p_whatsapp), left(p_center, 40), 'reserve');

  return jsonb_build_object('ok', true, 'until', until_ts);
end;
$$;

revoke all on function public.reserve_room(bigint, text, text, text) from public;
grant execute on function public.reserve_room(bigint, text, text, text) to anon, authenticated;
