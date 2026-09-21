-- Roadmap 1.20 — Visit type pick-list for Quick Capture's Visit entries.
-- Same pattern as contact_method (20260918170000_capture_log_type_fields.sql):
-- a plain text column, valid values enforced at the application layer
-- against active pick_list_options rows, not a DB check constraint, so
-- the account owner can extend the taxonomy without a migration.
alter table capture_log add column visit_type text;

-- Seed with the exact 7 values this item specifies — an explicitly given
-- taxonomy, not a guess, same as contact_method's seed.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'visit_type', c.value
from accounts a
cross join (
  values
    ('Maintenance/Repair'),
    ('Estimate/Quote'),
    ('Inspection'),
    ('Tenant meeting'),
    ('Showing'),
    ('Move-in/Move-out'),
    ('Other')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
