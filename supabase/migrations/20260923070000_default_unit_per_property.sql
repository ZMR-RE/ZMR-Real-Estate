-- Auto-create a default Unit for every property, so single-unit
-- properties work the same as multi-unit ones for Occupancy tracking
-- (the merged Units-occupied stat card, roadmap 7.52) without ever
-- requiring the user to manually add a "Unit 1" for a property that,
-- to them, is just one house/townhouse.
--
-- unit_label is normally plain user-entered text (per 20260911130000's
-- own comment: "never inferred from anything, per CLAUDE.md's data
-- integrity rule") — this is a deliberate, explicit exception for this
-- one system-generated row only: the label is never shown anywhere on
-- a single-unit property's UI (UnitsSection.tsx hides it whenever a
-- property has exactly one active unit), so its literal text is
-- cosmetic/internal. 'Unit 1' is used so the label still reads
-- sensibly if the property later becomes multi-unit (a user manually
-- adding a second unit makes both labels visible again, unchanged).
--
-- status is NOT NULL and normally always an explicit user choice (the
-- manual "+ Add unit" form has no default — checked live, it starts
-- blank and requires an active pick before Save is even possible).
-- Per explicit user direction: do not invent a status value for the
-- auto-created unit. '' (empty string) is used as the "not actually
-- set yet" sentinel — satisfies the NOT NULL constraint without
-- claiming a real pick-list value (Rented/Vacant - Ready/Renovating/
-- Listed) that wasn't actually chosen by anyone. useOccupancySnapshot's
-- own byStatus[unit.status] lookup already treats '' as "not Rented"
-- with no code change needed, so an unset-status unit correctly shows
-- as unoccupied (not falsely occupied) until a real status is entered.
create or replace function create_default_unit_for_property()
returns trigger
language plpgsql
as $$
begin
  insert into units (account_id, property_id, unit_label, status)
  values (new.account_id, new.id, 'Unit 1', '');
  return new;
end;
$$;

create trigger properties_create_default_unit
  after insert on properties
  for each row
  execute function create_default_unit_for_property();

-- One-time backfill for 2169 Ash St (the one pre-existing property with
-- zero units) — same '' unset-status sentinel as above, per explicit
-- user direction: no default status exists in the app to replicate, and
-- guessing Rented/Vacant would violate the data integrity rule. The
-- user fills in the real status via the dashboard afterward.
insert into units (account_id, property_id, unit_label, status)
select p.account_id, p.id, 'Unit 1', ''
from properties p
where p.id = 'edc7e8e1-d08d-479f-b3d2-9266e87b45ad'
  and not exists (select 1 from units u where u.property_id = p.id);
