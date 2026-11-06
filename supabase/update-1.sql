-- ============================================================
-- QAREEB UPDATE 1  (run in Supabase > SQL Editor)
--  * transit and advantages columns for each room
--  * removes "Excel Language Centre (Seri Kembangan)"
--  * adds the British Council (position taken from OpenStreetMap)
--  * fills SAMPLE advantages / transit for the 6 sample rooms
--    (replace them with real facts when you add real rooms)
-- ============================================================

alter table public.listings
  add column if not exists station_name text,
  add column if not exists station_type text check (station_type in ('MRT','LRT','Monorail','KTM','BRT','Other')),
  add column if not exists station_min  int check (station_min between 0 and 120),
  add column if not exists bus_min      int check (bus_min between 0 and 120),
  add column if not exists amenities    text[] not null default '{}';

delete from public.centers where id = 'excel-sk';

insert into public.centers (id, grp, name_en, name_ar, lat, lng, sort) values
  ('british-council','center','British Council (Jalan Ampang)','المجلس الثقافي البريطاني (جالان أمبانغ)',3.15964,101.70879,10)
on conflict (id) do nothing;

-- SAMPLE values only
update public.listings set amenities = '{wifi,aircon,kitchen,security}'                          where id = 1;
update public.listings set amenities = '{wifi,kitchen,washer}'                                   where id = 2;
update public.listings set amenities = '{pool,gym,security,aircon,wifi}', station_name='KLCC', station_type='LRT', station_min=7, bus_min=3 where id = 3;
update public.listings set amenities = '{wifi,aircon,restaurants,supermarket}', station_name='Bukit Bintang', station_type='Monorail', station_min=4, bus_min=2 where id = 4;
update public.listings set amenities = '{wifi,aircon,bathroom}', station_name='Ampang Park', station_type='LRT', station_min=5, bus_min=2 where id = 5;
update public.listings set amenities = '{parking,supermarket}'                                   where id = 6;
