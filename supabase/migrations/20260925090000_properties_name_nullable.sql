-- Package 1 — Name is no longer a required identifier (address already
-- is, per shared/propertyLabel.ts). Existing values are untouched by
-- this migration; it only relaxes the constraint so a new property can
-- be created without one. No backfill, no default, no data change.
alter table properties alter column name drop not null;
