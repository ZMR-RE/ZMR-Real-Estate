-- Forward-fix for a regression this session introduced in
-- 20260925100000_audit_trail_contacts.sql (already applied to Practice
-- — corrected here with a new migration, not by editing that file in
-- place, since environments must never diverge from tracked history).
--
-- That migration replaced contact_links_audit_log's existing
-- `after update` trigger with `after insert`, reasoning "no updated_at
-- column, so it's a create-once record." That reasoning was wrong for
-- contact_links specifically: contactsQueries.ts's setContactLinkPrimary
-- (line 112-113) does a real `update contact_links set
-- is_primary_contact = ...` — a genuine, real update path, unrelated to
-- whether the table happens to track its own updated_at timestamp.
-- Verified there is no equivalent update call anywhere on
-- contact_methods (only insert/delete, contactsQueries.ts's
-- addContactMethod/removeContactMethod) — that table's insert-only
-- coverage from 20260925100000 was correct and is left unchanged here.
--
-- Restores both insert and update coverage on contact_links, same shape
-- as `contacts` already has. Does not add delete coverage to anything —
-- deletes remain uncovered by this audit mechanism on every table it
-- touches (contacts, contact_methods, contact_links, and every
-- pre-existing table: properties/llcs/mortgage_details/
-- financial_transactions/financial_periods), a pre-existing limitation
-- of log_audit_changes() itself, not something this migration expands
-- or repairs.
drop trigger contact_links_audit_log on contact_links;
create trigger contact_links_audit_log
  after insert or update on contact_links
  for each row
  execute function log_audit_changes();
