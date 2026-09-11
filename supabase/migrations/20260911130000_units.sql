-- Units as a real entity (Roadmap item 7.2) — replaces the free-text
-- properties.unit_config field with real per-unit records.
--
-- unit_label is plain user-entered text (e.g. "Unit A", "Unit 1") — never
-- inferred from anything, per CLAUDE.md's data integrity rule. status
-- uses the generic pick-list system (8.1) rather than a fixed enum, same
-- pattern as documents.category/tasks.task_type.
create table units (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_label text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index units_account_property_idx on units (account_id, property_id);

alter table units enable row level security;

create policy "members can manage their units"
  on units for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function set_units_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger units_set_updated_at
  before update on units
  for each row
  execute function set_units_updated_at();

-- Wire property_specs.unit_id (added unused in 7.4) now that units exists.
-- on delete set null: deleting a unit shouldn't delete specs recorded
-- against it, just fall them back to property-level.
alter table property_specs
  add constraint property_specs_unit_id_fkey
  foreign key (unit_id) references units(id) on delete set null;

-- properties.unit_config had zero data in it for either existing property
-- (verified live before writing this migration) — safe to drop outright,
-- same as llc_name was dropped once llcs became a real entity
-- (20260904193000_llcs_entity.sql). No migration of guessed unit rows:
-- unit_label must be genuinely user-entered, not inferred from free text.
alter table properties drop column unit_config;

-- unit_status pick-list options: carrying forward the exact taxonomy
-- already named in roadmap item 7.11 (rented/vacant-ready/renovating/
-- listed), not a fresh guess — same rationale as document_type's seed.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'unit_status', c.value
from accounts a
cross join (
  values ('Rented'), ('Vacant - Ready'), ('Renovating'), ('Listed')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
