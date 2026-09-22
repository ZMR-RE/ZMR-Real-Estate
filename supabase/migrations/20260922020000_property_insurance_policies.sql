-- Insurance as a historical ledger (roadmap item, new build) — replaces
-- the single static Insurance block on the property record
-- (properties.insurance_provider/insurance_policy_number, no dates, no
-- coverage period, no premium, no multiple documents) with a dated
-- entry log, exact same pattern as Property Tax Installments (9.5):
-- one row per policy period, multiple documents per entry via the same
-- reverse-FK-on-documents design 9.5's multi-document revision
-- established (20260921230000).
--
-- Unlike tax installments (two fixed slots per year), an insurance
-- entry has just one set of documents, so no slot-number column is
-- needed here — documents.property_insurance_policy_id alone is enough
-- to group them.
create table property_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  provider text not null,
  policy_number text,
  contact_info text,
  coverage_start_date date,
  coverage_end_date date,
  premium_amount numeric(12, 2) check (premium_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_insurance_policies_account_property_idx
  on property_insurance_policies (account_id, property_id);

alter table property_insurance_policies enable row level security;

create policy "members can manage their property insurance policies"
  on property_insurance_policies for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

alter table documents add column property_insurance_policy_id uuid references property_insurance_policies(id) on delete cascade;

-- Carry forward each property's existing real insurance_provider/
-- insurance_policy_number as its first ledger entry — this is the
-- account's own already-entered data, just relocated to its new home,
-- not a guess (CLAUDE.md's data-integrity rule). Coverage dates and
-- premium are left null since this app never tracked them before this
-- ledger existed — leaving them blank for the user to fill in is
-- correct, not inferring a value.
insert into property_insurance_policies (account_id, property_id, provider, policy_number)
select account_id, id, insurance_provider, insurance_policy_number
from properties
where insurance_provider is not null and insurance_provider != '';

-- properties.insurance_provider/insurance_policy_number are kept in
-- place, unused, never dropped, per CLAUDE.md's no-drop-without-approval
-- rule — same precedent as installment_1_document_id/
-- installment_2_document_id (20260910230000) and capture_log.vendor_id
-- (20260918090000).
