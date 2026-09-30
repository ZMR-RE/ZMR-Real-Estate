\set QUIET on
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
-- The app's exact write shapes: Void = voidTransaction (financialsQueries);
-- Match = markTransactionsReconciled (bankReconciliationQueries, now with
-- its voided filter); Edit-form save = updateTransaction incl. the
-- "Matched to bank/credit-card statement" checkbox.
-- ---- ordinary Void
select t($n$reconcile T1 through the reconciliation save$n$, $q$update financial_transactions set statement_reconciled = true where account_id = 'a0000000-0000-0000-0000-00000000000a' and voided = false and id in ('c0000000-0000-0000-0000-000000000001')$q$, 'ok');
select t($n$ordinary Void of a matched entry is refused with its reason$n$, $q$update financial_transactions set voided = true, voided_at = now() where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ZM091');
select check_true($n$…T1 still active and matched$n$, (select not voided and statement_reconciled from financial_transactions where id = 'c0000000-0000-0000-0000-000000000001'));
select t($n$void and clear the match in ONE save is refused (un-matching must be its own save)$n$, $q$update financial_transactions set voided = true, voided_at = now(), statement_reconciled = false where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ZM093');
select t($n$clear the match as its own save (edit-form checkbox)$n$, $q$update financial_transactions set statement_reconciled = false, description = 'match cleared' where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select check_true($n$…the audit trail recorded the match removal$n$, (select count(*) = 1 from audit_log where table_name = 'financial_transactions' and record_id = 'c0000000-0000-0000-0000-000000000001' and field_name = 'statement_reconciled' and old_value = 'true' and new_value = 'false'));
select t($n$then the ordinary Void succeeds$n$, $q$update financial_transactions set voided = true, voided_at = now() where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ok');
-- ---- reconciliation of voided entries
select t($n$void T2 (never matched)$n$, $q$update financial_transactions set voided = true, voided_at = now() where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t($n$the reconciliation save skips a voided entry and reports the shortfall (1 of 2 matched)$n$, $q$do $d$ declare n integer; begin update financial_transactions set statement_reconciled = true where account_id = 'a0000000-0000-0000-0000-00000000000a' and voided = false and id in ('c0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000003'); get diagnostics n = row_count; if n <> 1 then raise exception 'matched % rows', n using errcode = 'P0001'; end if; end $d$$q$, 'ok');
select check_true($n$…T2 stayed unmatched, T3 matched$n$, (select (select not statement_reconciled from financial_transactions where id = 'c0000000-0000-0000-0000-000000000002') and (select statement_reconciled from financial_transactions where id = 'c0000000-0000-0000-0000-000000000003')));
select t($n$any other caller marking a voided entry matched is refused by the database$n$, $q$update financial_transactions set statement_reconciled = true where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ZM092');
select t($n$…including via the edit form$n$, $q$update financial_transactions set statement_reconciled = true, description = 'x' where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ZM092');
select t($n$a new entry cannot be created voided and matched$n$, $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date,voided,voided_at,statement_reconciled) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',5,'2025-10-10',true,now(),true)$q$, 'ZM092');
select t($n$restoring a voided entry while matching it (one save) is allowed — the result is consistent$n$, $q$update financial_transactions set voided = false, statement_reconciled = true where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ok');
select check_true($n$…T2 is active and matched$n$, (select not voided and statement_reconciled from financial_transactions where id = 'c0000000-0000-0000-0000-000000000002'));
select t($n$voiding and matching a clean entry in one save is refused (would be voided and matched)$n$, $q$update financial_transactions set voided = true, voided_at = now(), statement_reconciled = true where id = 'c0000000-0000-0000-0000-000000000011'$q$, 'ZM092');
select check_true($n$…T11 unchanged$n$, (select not voided and not statement_reconciled from financial_transactions where id = 'c0000000-0000-0000-0000-000000000011'));
select t($n$a legacy conflict row can be restored while un-matching it (one save)$n$, $q$update financial_transactions set voided = false, statement_reconciled = false where id = 'c0000000-0000-0000-0000-000000000010'$q$, 'ok');
-- ---- unaffected ordinary work
select t($n$a normal entry can be matched$n$, $q$update financial_transactions set statement_reconciled = true where id = 'c0000000-0000-0000-0000-000000000004'$q$, 'ok');
select t($n$…and edited without touching the flags$n$, $q$update financial_transactions set description = 'edited', amount = 41 where id = 'c0000000-0000-0000-0000-000000000004'$q$, 'ok');
select t($n$a normal unmatched entry can be voided$n$, $q$update financial_transactions set voided = true, voided_at = now() where id = 'c0000000-0000-0000-0000-000000000005'$q$, 'ok');
-- ---- pre-existing conflicts: listed, never rewritten or blocked
select check_true($n$the legacy conflict is listed for review$n$, (select count(*) = 1 from financial_transactions_void_reconcile_conflicts where id = 'c0000000-0000-0000-0000-000000000009'));
select t($n$an unrelated edit on the legacy conflict row still works$n$, $q$update financial_transactions set description = 'under review' where id = 'c0000000-0000-0000-0000-000000000009'$q$, 'ok');
select check_true($n$…and it was not rewritten$n$, (select voided and statement_reconciled from financial_transactions where id = 'c0000000-0000-0000-0000-000000000009'));
select check_true($n$the review list never shows another workspace's rows$n$, (select count(*) = 1 from financial_transactions_void_reconcile_conflicts));
-- ---- signed-out callers (hosted Supabase grants anon by default; revoked explicitly)
reset role;
set role anon;
select t($n$signed-out callers cannot read the conflict review list$n$, $q$select count(*) from financial_transactions_void_reconcile_conflicts$q$, '42501');
reset role;
