-- Additional scope for the roadmap 7.33 (5) Insurance ledger expansion.
--
-- Payment plan is a closed set of choices (e.g. Annual/Monthly) — per
-- CLAUDE.md's pick-list-first rule, this defaults to the account-scoped
-- pick-list system rather than a fixed enum. Seeded with the two values
-- explicitly given in the instruction (not a guessed taxonomy).
alter table property_insurance_policies add column payment_plan text;

insert into pick_list_options (account_id, list_name, value)
select a.id, 'insurance_payment_plan', c.value
from accounts a
cross join (values ('Annual'), ('Monthly')) as c(value)
on conflict (account_id, list_name, value) do nothing;

-- Policy discounts is free text, per the instruction's own stated
-- option — no existing repeatable-tag-list UI pattern exists elsewhere
-- in this app to justify the added complexity of a new one here.
alter table property_insurance_policies add column policy_discounts text;
