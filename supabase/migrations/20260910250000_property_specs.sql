-- Property Specs/Measurements Log (Roadmap item 7.4) — free-form key-value
-- specs per property (e.g. "Door width, upstairs bathroom" -> "28 inches").
-- No fixed label schema on purpose: every property's measurement needs
-- differ, so labels are whatever the user types, not a pick list.
--
-- unit_id is a plain nullable uuid with no FK yet — Units (7.2) isn't a
-- real linked-record table yet. Once it lands, a spec can optionally
-- scope to a specific unit instead of the whole property; for now every
-- entry is property-level.
create table property_specs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid,
  label text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_specs_account_property_idx on property_specs (account_id, property_id);

alter table property_specs enable row level security;

create policy "members can manage their property specs"
  on property_specs for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- updated_at must be automatically maintained (roadmap 7.4's own wording),
-- not left to whichever client happens to remember to set it — so this is
-- a DB trigger rather than app-code convention.
create or replace function set_property_specs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger property_specs_set_updated_at
  before update on property_specs
  for each row
  execute function set_property_specs_updated_at();
