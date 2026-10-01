-- Rollback for 20261003100000_transaction_responsible_entity — DATA-PRESERVING.
--
-- Normal recovery needs NO database change. Re-publish the previous frontend.
-- An older frontend never reads, writes or clears responsible_entity_id:
-- its inserts leave it null, and its updates don't name it, so confirmed
-- assignments are kept. This is tested in
-- supabase/tests/entity_responsibility (old-client cases).
--
-- Run this script only if the suggestion function itself must be withdrawn.
-- It removes ONLY suggested_transaction_entity(). It deliberately KEEPS:
--   * the responsible_entity_id column and every confirmed assignment (user-entered data);
--   * its indexes and foreign key (an entity in use still cannot be deleted);
--   * the same-workspace check on it (stored references stay valid).
-- Then, from the release checkout:
--   supabase migration repair --linked --status reverted 20261003100000
-- Re-applying the migration later is safe: it is re-runnable and leaves
-- existing assignments untouched (also tested).
--
-- Removing the column is NOT a rollback step. That would delete
-- owner-entered data, so it needs its own approved migration, with the
-- assignments exported first.

begin;
drop function if exists suggested_transaction_entity(uuid, date);
commit;
