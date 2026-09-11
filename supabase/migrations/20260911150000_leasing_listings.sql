-- Leasing/Listing Tracker (Roadmap item 7.3) — a per-unit ledger of
-- listing activity: where a unit was posted, when, and any
-- prospective-tenant notes gathered along the way. Depends on units
-- (7.2, 20260911130000_units.sql) for unit_id — a unit can be listed,
-- re-listed after a tenant moves out, etc., so this is a history a
-- unit can have many of, same shape as mortgage_payments or
-- property_specs, not a single fixed field on the unit row.
create table leasing_listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  platform text not null,
  date_posted date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leasing_listings_account_unit_idx on leasing_listings (account_id, unit_id);

alter table leasing_listings enable row level security;

create policy "members can manage their leasing listings"
  on leasing_listings for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function set_leasing_listings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leasing_listings_set_updated_at
  before update on leasing_listings
  for each row
  execute function set_leasing_listings_updated_at();

-- "Days live" is calculated from date_posted, not stored — always
-- current, never goes stale. platform is a pick list (8.1,
-- list_name 'listing_platform'), left with zero seeded options: the
-- roadmap's "e.g. Zillow, Facebook Marketplace" is illustrative, not an
-- established taxonomy to carry forward, so seeding it would be
-- guessing — same reasoning payment_method got in 8.1's own migration.
