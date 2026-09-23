-- Roadmap 7.40 — Financial accounts at the LLC level. A property may
-- keep its own property-specific account in addition to its LLC's
-- shared ones (no forced either/or), so this is an additive change:
-- property_id becomes nullable, a new nullable llc_id is added, and a
-- check constraint enforces exactly one of the two set per row. No
-- existing row is touched — every current account keeps its
-- property_id exactly as-is, satisfying the constraint automatically.
alter table property_financial_accounts alter column property_id drop not null;

alter table property_financial_accounts
  add column llc_id uuid references llcs(id) on delete cascade;

alter table property_financial_accounts
  add constraint property_financial_accounts_scope_check
  check (
    (property_id is not null and llc_id is null)
    or (property_id is null and llc_id is not null)
  );

create index property_financial_accounts_llc_idx on property_financial_accounts (account_id, llc_id);
