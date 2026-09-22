-- Roadmap 7.33 — several Property Information fixes + Insurance ledger
-- expansion.
--
-- Item 3: Heating & Cooling is no longer a flat pair of Property
-- Information fields — HVAC becomes an Area option inside the existing
-- Specs & measurements section instead (7.4's per-unit/whole-building
-- Scope architecture). ac_type/heating_type columns and pick lists stay
-- in place, unused, never dropped (confirmed no property has a value
-- set, per CLAUDE.md's no-drop-without-approval rule) — same precedent
-- as zoning_use_code/garage_parking_spaces (20260922100000).
insert into pick_list_options (account_id, list_name, value)
select a.id, 'property_spec_area', 'HVAC'
from accounts a
on conflict (account_id, list_name, value) do nothing;

-- Item 4: Exterior wall material converts from single-select to a
-- multi-select checklist. New array column; the old singular column
-- (added last session, confirmed still empty on every property) is kept
-- unused, same no-drop precedent as above.
alter table properties add column exterior_wall_materials text[] not null default '{}';

-- Reseed the 'exterior_wall_material' pick list (still the backing list
-- for the new checkbox multi-select — still account-editable, just
-- rendered as checkboxes instead of a dropdown) with the exact 6 values
-- this item specifies. Frame/Masonry are genuinely new; the other 4
-- previously-seeded values not in this list (Wood siding, Fiber cement,
-- Stone, Aluminum siding) are archived rather than deleted — the
-- account's own existing add/archive mechanism (8.1), not a hard
-- removal, and safe since no property has ever had a value set here.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'exterior_wall_material', c.value
from accounts a
cross join (values ('Frame'), ('Masonry')) as c(value)
on conflict (account_id, list_name, value) do nothing;

update pick_list_options
set active = false
where list_name = 'exterior_wall_material'
  and value in ('Wood siding', 'Fiber cement', 'Stone', 'Aluminum siding');

-- Item 5: Insurance ledger expansion — deductible, named insured, and a
-- structured representative (name/phone/email) replacing the single
-- contact_info free-text field. contact_info is kept, unused, never
-- dropped (2169 Ash St's only real entry has always had it blank,
-- confirmed live before this change, so there's nothing to carry
-- forward or guess at). Active/Expired status is NOT a column — it's
-- computed at render time from coverage_end_date vs today (same
-- "real-time check, not a snapshot" approach as the Action Queue
-- priority color system, roadmap 7.15), so nothing to add here for it.
alter table property_insurance_policies add column deductible numeric(12, 2) check (deductible >= 0);
alter table property_insurance_policies add column named_insured text;
alter table property_insurance_policies add column representative_name text;
alter table property_insurance_policies add column representative_phone text;
alter table property_insurance_policies add column representative_email text;
