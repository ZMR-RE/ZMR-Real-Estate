-- O1-A close-out (Batch I5): stale-edit protection for the Property
-- information save path.
--
-- properties.updated_at has existed since 20260903173528_initial_schema.sql
-- but nothing has ever maintained it: unlike property_specs, units,
-- tenants, leasing_listings, utility_records, mileage_trips and leases
-- (each of which got its own set_<table>_updated_at trigger), properties
-- never got one, and no client code sets the column either — so every
-- existing row still carries its original insert timestamp regardless of
-- how many times it has been edited since. The column cannot serve as an
-- optimistic-concurrency token until it actually moves on every write.
-- Same per-table trigger convention as the seven tables above, not a
-- shared function, to match how this schema already does it.
create or replace function set_properties_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at
  before update on properties
  for each row
  execute function set_properties_updated_at();

-- How the guard works (application side, src/modules/properties/
-- propertiesQueries.ts updateProperty): the client sends the updated_at
-- it last read as an extra `.eq('updated_at', <that value>)` filter on
-- the UPDATE. If another editor has saved since, the row's updated_at has
-- moved (this trigger), the filter matches zero rows, and the UPDATE
-- writes nothing — the newer save is never overwritten, enforced by the
-- database itself, not by client-side comparison. The client then
-- re-reads the row to show the user what changed and keeps their unsaved
-- draft; it never rebases and re-saves on its own.
--
-- The existing properties_audit_log trigger (after update) already lists
-- updated_at in its skip_cols, so this trigger's own write to the column
-- does not produce a spurious audit row on every save.
--
-- No backfill: existing rows keep their current (stale) updated_at until
-- their next real edit bumps it. A stale baseline only means the FIRST
-- save of a never-edited row compares against the insert timestamp,
-- which is still the row's true current value — the guard is correct
-- from the very first write.
