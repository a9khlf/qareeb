-- ============================================================
-- QAREEB UPDATE 5: "Cost to move in" (run in Supabase > SQL Editor)
-- Per room: security deposit (months of rent), rent paid in advance (months),
-- utility deposit (RM), and whether a written tenancy agreement is provided.
-- Leave deposit_months empty to hide the cost box for a room.
-- The SAMPLE values at the bottom are made up. Replace them with real facts.
-- ============================================================
alter table public.listings
  add column if not exists deposit_months    numeric(3,1) check (deposit_months between 0 and 12),
  add column if not exists advance_months    numeric(3,1) check (advance_months between 0 and 12),
  add column if not exists utility_deposit   int          check (utility_deposit between 0 and 5000),
  add column if not exists agreement_provided boolean not null default false;

-- SAMPLE values only
update public.listings set deposit_months = 2, advance_months = 1, utility_deposit = 200, agreement_provided = true  where id = 1;
update public.listings set deposit_months = 2, advance_months = 1, utility_deposit = 100, agreement_provided = true  where id = 2;
update public.listings set deposit_months = 2, advance_months = 1, utility_deposit = 300, agreement_provided = false where id = 3;
update public.listings set deposit_months = 1, advance_months = 1, utility_deposit = 100, agreement_provided = false where id = 4;
update public.listings set deposit_months = 2, advance_months = 1, utility_deposit = 150, agreement_provided = false where id = 5;
update public.listings set deposit_months = 2, advance_months = 1, utility_deposit = 150, agreement_provided = false where id = 6;
