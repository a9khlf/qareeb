-- ============================================================
-- QAREEB UPDATE 15: the date Qareeb checked a room (run in Supabase > SQL Editor, after update-14.sql)
-- Students see "Checked by Qareeb on 12 November 2026" on a verified room. The staff room form gets a date field.
-- Until this is run, the website and the staff area work as before and simply do not show a date.
-- ============================================================
alter table public.listings add column if not exists verified_at date;
