-- ============================================================
-- QAREEB UPDATE 7: "Request a live video tour" (run in Supabase > SQL Editor)
-- Lets the website record a video-tour request next to the other kinds of request,
-- and keeps visitors from creating fake RESERVATION rows (those only come from reserve_room()).
-- ============================================================
alter table public.requests drop constraint if exists requests_kind_check;
alter table public.requests add constraint requests_kind_check check (kind in ('ask','reserve','tour'));

drop policy if exists "public can send a request" on public.requests;
create policy "public can send a request" on public.requests
  for insert to anon, authenticated
  with check (
    length(trim(name)) between 1 and 100
    and length(trim(whatsapp)) between 6 and 25
    and (note is null or length(note) <= 500)
    and kind in ('ask', 'tour')
  );
