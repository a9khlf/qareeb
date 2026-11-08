-- ============================================================
-- QAREEB UPDATE 6 (optional, SAMPLE data only; run in Supabase > SQL Editor)
-- Makes two sample rooms use the new "Who lives here" filter and prayer / halal tags,
-- so you can see how they look. Replace them with real facts when you add real rooms.
-- ============================================================
update public.listings
  set gender = 'women',
      amenities = array(select distinct unnest(amenities || '{qibla,prayerspace}'::text[]))
  where id = 2;
update public.listings set gender = 'family' where id = 6;
update public.listings
  set amenities = array(select distinct unnest(amenities || '{halalkitchen}'::text[]))
  where id = 1;
