-- Roadmap 7.4 revision — consolidate Specs & measurements into one
-- property-level section (previously split: a property-wide instance on
-- the Overview tab plus a separately-fetched instance nested inside each
-- unit's card in UnitsSection.tsx). Scope already existed in the schema
-- as unit_id (null = whole building, a real id = that unit) — no data
-- migration needed, every existing row already maps to the correct
-- Scope with zero loss.
--
-- Adds Area, a new pick-list field (8.1 pattern) seeded with the
-- taxonomy this item specifies. Left null on every existing row (unset)
-- rather than guessed — per CLAUDE.md's data-integrity rule, only
-- user-entered data is treated as truth.
alter table property_specs add column area text;

insert into pick_list_options (account_id, list_name, value)
select a.id, 'property_spec_area', c.value
from accounts a
cross join (
  values ('Kitchen'), ('Bathroom'), ('Bedroom'), ('Exterior'), ('Other')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
