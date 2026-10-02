-- Live schema (d9cdcb3): the history table does not exist. These are the exact SQL shapes of
-- H1's PostgREST requests (reportsQueries.listHistoryPaymentPrincipalsForAccount).
\set QUIET on
select a('B1 history table absent on the live schema', $q$to_regclass('public.mortgage_history_payments') is null$q$);
\i session_a.sql
select t('B2 H1 all-time history read → undefined_table', $q$select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false$q$, '42P01');
select t('B3 H1 year history read → undefined_table', $q$select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false and payment_date >= '2025-01-01' and payment_date <= '2025-12-31'$q$, '42P01');
select a('B4 existing payments query unchanged: principal 200', $q$(select sum(principal_amount) = 200 from (select property_id, principal_amount from mortgage_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q)$q$);
reset role;
