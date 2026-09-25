-- Forward-fix for a second regression this session introduced in
-- 20260925100000_audit_trail_contacts.sql (already applied to Practice
-- — corrected here with a new migration, not by editing that file in
-- place, same reasoning as 20260925110000's contact_links fix).
--
-- contact_methods_audit_log originally covered `after update`
-- (20260925030000_contacts.sql:89), same as contacts/contact_links.
-- 20260925100000 replaced it with `after insert` only, reasoning "no
-- update call path exists in the app today, and no updated_at column."
-- That reasoning does not justify the loss: RLS already permits update
-- on this table (`for all`, 20260925030000), and the absence of a
-- current UI call site is not evidence that update audit coverage is
-- unneeded — a future call site (or a direct/service-role edit) would
-- silently lose audit coverage the original migration deliberately
-- provided. Restored below. No delete-audit scope is added (deletes
-- remain uncovered everywhere this mechanism is used, unchanged), and
-- no permission/RLS change is made — this only restores the trigger.
drop trigger contact_methods_audit_log on contact_methods;
create trigger contact_methods_audit_log
  after insert or update on contact_methods
  for each row
  execute function log_audit_changes();
