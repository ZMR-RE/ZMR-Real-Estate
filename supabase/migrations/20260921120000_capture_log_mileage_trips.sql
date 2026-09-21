-- Roadmap 1.21 — Mileage gets optional Start/End destination fields.
-- When both are filled alongside a recorded miles value, that
-- start/end/miles combination is remembered as a reusable named trip
-- (identified by its start+end pair) so a later entry over the same
-- route can auto-fill its mileage instead of re-typing it. Miles +
-- description alone (no start/end) stays a complete, valid entry on its
-- own — this doesn't touch capture_log's existing miles_driven-based
-- completeness check (captureCalculations.ts).

alter table capture_log add column start_destination text;
alter table capture_log add column end_destination text;

-- Scoped to (account_id, property_id) per explicit product decision —
-- a trip from a prior session logged against one property shouldn't
-- surface as a suggestion when logging mileage for an unrelated one.
-- unique on the (property, start, end) triple: saving the same route
-- again updates its remembered miles (most-recently-logged value wins)
-- rather than creating a duplicate reusable trip.
create table mileage_trips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  start_destination text not null,
  end_destination text not null,
  miles numeric(8, 1) not null check (miles > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, property_id, start_destination, end_destination)
);

create index mileage_trips_account_property_idx on mileage_trips (account_id, property_id);

alter table mileage_trips enable row level security;

create policy "members can manage their mileage trips"
  on mileage_trips for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function set_mileage_trips_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger mileage_trips_set_updated_at
  before update on mileage_trips
  for each row
  execute function set_mileage_trips_updated_at();
