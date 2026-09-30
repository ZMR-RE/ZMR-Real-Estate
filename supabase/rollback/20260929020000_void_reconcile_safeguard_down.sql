-- ROLLBACK for 20260929020000_void_reconcile_safeguard.sql — only if the
-- release must be reverted, and only with explicit approval. Removes the
-- rule and the review view; changes no transaction data. If the migration
-- history row must also be removed, do that through the approved release
-- procedure, not here.
begin;
drop view if exists financial_transactions_void_reconcile_conflicts;
drop trigger if exists financial_transactions_void_reconcile on financial_transactions;
drop function if exists trg_financial_transactions_void_reconcile();
commit;
