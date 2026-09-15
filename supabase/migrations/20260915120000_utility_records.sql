-- Utility records (Roadmap item 7.12) — net new; nothing existed for
-- this beyond the old, unused properties.utilities jsonb column (left
-- alone here, out of this migration's scope — dropping it isn't asked
-- for by 7.12 and isn't worth bundling into an already-large change).
--
-- Linked to Property (unit_id null = building-level, e.g. a shared water
-- main) or a specific Unit (unit_id set) — same nullable-unit_id pattern
-- as property_specs (7.4). responsibility is a small fixed domain named
-- directly in the roadmap item's own wording, so it's a check constraint
-- rather than routed through the 8.1 generic pick-list system;
-- utility_type (Electric/Water/Gas/etc.) is open-ended and account-
-- specific, so that one *is* a pick-list (list_name 'utility_type'),
-- matching document_type/task_type/unit_status precedent. No seeded
-- values — there's no established taxonomy to carry forward here.
create table utility_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid references units(id) on delete cascade,
  utility_type text not null,
  responsibility text not null check (responsibility in ('Owner', 'Tenant', 'Split')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index utility_records_account_property_idx on utility_records (account_id, property_id);

alter table utility_records enable row level security;

create policy "members can manage their utility records"
  on utility_records for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function set_utility_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger utility_records_set_updated_at
  before update on utility_records
  for each row
  execute function set_utility_records_updated_at();
