-- ROLLBACK for 20260929020000_void_reconcile_safeguard.sql — only if the
-- release must be reverted, and only with explicit approval. Removes the
-- rule and the review view; changes no transaction data. The migration
-- history row is removed separately, in the approved procedure, with
--   supabase migration repair --status reverted 20260929020000
-- (--linked only for production from its release checkout; Practice uses
-- --db-url — the main checkout's link points at production)
-- (never by editing supabase_migrations by hand).
begin;
drop view if exists financial_transactions_void_reconcile_conflicts;
drop trigger if exists financial_transactions_void_reconcile on financial_transactions;
drop function if exists trg_financial_transactions_void_reconcile();
commit;
