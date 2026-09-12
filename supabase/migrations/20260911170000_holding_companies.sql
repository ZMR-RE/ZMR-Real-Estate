-- Holding Company as a real linked entity (Roadmap item 8.7):
-- Holding Company -> owns -> LLC -> owns -> Property. Not required data
-- until one actually exists, per the roadmap item's own wording — so
-- llcs.holding_company_id is nullable and nothing defaults it.
create table holding_companies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

alter table holding_companies enable row level security;

create policy "members can manage their holding companies"
  on holding_companies for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- on delete set null (not restrict) — deleting a Holding Company should
-- unlink its LLCs, not block the deletion or cascade-delete real LLC
-- records.
alter table llcs add column holding_company_id uuid references holding_companies(id) on delete set null;

-- llcs already has the 7.8 audit trigger (llcs_audit_log) attached to
-- every column except the standard skip list — holding_company_id
-- changes are picked up by that existing generic trigger automatically,
-- no migration change needed here.
