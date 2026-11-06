-- ============================================================
-- QAREEB UPDATE 3  (run in Supabase > SQL Editor, before admin.sql)
-- Adds a logo slot to each language center.
-- Upload logos from the admin page (Language centers > Edit).
-- ============================================================
alter table public.centers add column if not exists logo_url text;
