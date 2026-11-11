-- ============================================================
-- QAREEB UPDATE 18: move-in date, wifi speed, room sharing and house rules (run in Supabase > SQL Editor, after update-17.sql)
-- Students can filter by the day they arrive and see wifi speed, who they share with and the house rules.
-- Until this is run, the website and the staff area work as before and simply do not show these details.
-- ============================================================
alter table public.listings
  add column if not exists available_from date,
  add column if not exists wifi_mbps int check (wifi_mbps is null or wifi_mbps between 1 and 10000),
  add column if not exists sharing text check (sharing is null or sharing in ('private', 'shared')),
  add column if not exists housemates int check (housemates is null or housemates between 0 and 30),
  add column if not exists house_rules_en text not null default '',
  add column if not exists house_rules_ar text not null default '';
