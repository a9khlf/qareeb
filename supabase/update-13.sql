-- ============================================================
-- QAREEB UPDATE 13: Team page - freeze, remove with handover, bring back (run in Supabase > SQL Editor, after update-12.sql)
-- Freezing someone (active = off) stops them signing in; nothing is deleted.
-- Removing someone hands their open leads and links to a colleague, marks them as "left the team",
-- and keeps their record, their past lead credit and their history. A person who left can be brought back.
-- ============================================================

alter table public.staff add column if not exists left_at timestamptz;

create or replace function public.remove_staff(p_email text, p_to text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e     text := lower(trim(coalesce(p_email, '')));
  t     text := nullif(lower(trim(coalesce(p_to, ''))), '');
  leads int := 0;
  links int := 0;
begin
  if not public.has_perm('owner') then raise exception 'Only an owner can remove staff.'; end if;
  if e = '' or not exists (select 1 from public.staff where email = e) then raise exception 'No such team member.'; end if;
  if e = public.my_email() then raise exception 'You cannot remove yourself.'; end if;
  if t is not null then
    if t = e then raise exception 'Choose a different colleague to hand over to.'; end if;
    if not exists (select 1 from public.staff where email = t and active and left_at is null) then
      raise exception 'The colleague must be an active team member.';
    end if;
  end if;
  if t is null and exists (select 1 from public.requests where assigned_to = e and status not in ('rented', 'lost')) then
    raise exception 'This person has open leads. Choose a colleague to hand them to.';
  end if;

  if t is not null then
    update public.requests set assigned_to = t where assigned_to = e and status not in ('rented', 'lost');
    get diagnostics leads = row_count;
    update public.share_links set agent_email = t where agent_email = e;
    get diagnostics links = row_count;
  end if;
  update public.staff set active = false, left_at = now() where email = e;

  return jsonb_build_object('leads', leads, 'links', links);
end $$;

revoke all on function public.remove_staff(text, text) from public, anon;
grant execute on function public.remove_staff(text, text) to authenticated;
