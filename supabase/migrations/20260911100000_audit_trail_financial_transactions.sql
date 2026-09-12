-- Extend the audit trail (7.8) to financial_transactions (roadmap 9.17)
--
-- Reuses the generic log_audit_changes() trigger function from
-- 20260910271200_audit_trail.sql as-is — it already works on any table
-- with id/account_id columns, so no function changes are needed. Voiding
-- a transaction (financialsQueries.voidTransaction) is a plain UPDATE of
-- voided/voided_at, so it's covered by the same trigger with no special
-- casing: it shows up as two field changes like any other edit.
alter table audit_log drop constraint audit_log_table_name_check;
alter table audit_log add constraint audit_log_table_name_check
  check (table_name in ('properties', 'llcs', 'mortgage_details', 'financial_transactions'));

create trigger financial_transactions_audit_log
  after update on financial_transactions
  for each row
  execute function log_audit_changes();
