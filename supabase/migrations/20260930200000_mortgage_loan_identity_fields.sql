-- Mortgage correction (T1, isolated from Capture History and R2) —
-- owner-approved exceptions, per T3's mortgage audit:
--
-- 1. loan_number: the FULL loan number, stored as free text, as an
--    EXPLICIT exception to this app's otherwise-standard "last four
--    digits only" convention (financial_account.last_four). A loan
--    number commonly carries leading zeros (lost by any numeric column
--    type) and sometimes letters — text is the only correct storage
--    type, not a numeric one truncated/validated to "digits only".
--    Nullable: a mortgage already on file has no loan number recorded
--    today, and nothing here backfills one — see the Data Integrity
--    rule (never seed/infer/guess a field's value); the owner enters
--    the real number per mortgage, or leaves it blank.
-- 2. loan_type: a pick-list-governed field (8.1 convention — enforced
--    at the application layer against active pick_list_options rows,
--    not a database CHECK constraint, matching document_type's own
--    migration away from a hard-coded enum). Nullable, no backfill —
--    same reasoning as loan_number.
alter table mortgage_details add column loan_number text;
alter table mortgage_details add column loan_type text;

-- Seed loan_type with the exact 8 starting values the owner approved —
-- carrying forward an explicitly given list, not guessing a taxonomy
-- (same precedent as document_type's own seeding in
-- 20260910220000_pick_list_options.sql). Generic over whatever accounts
-- exist today, so this also does the right thing — nothing — for an
-- account with none yet; the owner can add/archive further values from
-- here via the existing Manage Options affordance.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'loan_type', c.value
from accounts a
cross join (
  values ('Conventional'), ('FHA'), ('VA'), ('USDA'), ('Portfolio'), ('Commercial'), ('HELOC'), ('Other')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
