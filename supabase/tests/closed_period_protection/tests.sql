\set QUIET on
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
-- helpers: insert text for a transaction
\set A '''a0000000-0000-0000-0000-00000000000a'''
\set PA '''a1000000-0000-0000-0000-00000000000a'''
select t('insert 2025 while open', $q$insert into financial_transactions (id,account_id,property_id,entry_type,category,payment_method,amount,transaction_date,vendor_id) values ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',10,'2025-12-31','a2000000-0000-0000-0000-00000000000a')$q$, 'ok');
select t('insert 2026 while open', $q$insert into financial_transactions (id,account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','income','rents_received','Bank',20,'2026-01-01')$q$, 'ok');
select t('lock 2025 (new period row)', $q$insert into financial_periods (account_id, year, status) values ('a0000000-0000-0000-0000-00000000000a', 2025, 'locked')$q$, 'ok');
select t('insert into locked 2025 (Dec 31)', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',5,'2025-12-31')$q$, 'ZM010');
select t('insert Jan 1 2026 next to locked 2025', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',5,'2026-01-01')$q$, 'ok');
select t('edit amount in locked 2025', $q$update financial_transactions set amount = 11 where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ZM010');
select t('void in locked 2025', $q$update financial_transactions set voided = true, voided_at = now() where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ZM010');
select t('move 2025 -> 2026 (out of locked)', $q$update financial_transactions set transaction_date = '2026-02-01' where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ZM010');
select t('move 2026 -> 2025 (into locked)', $q$update financial_transactions set transaction_date = '2025-06-01' where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ZM010');
select t('edit within open 2026', $q$update financial_transactions set amount = 21 where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t('API delete in locked 2025', $q$delete from financial_transactions where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ZM010');
select t('delete locked period row (silent unlock)', $q$delete from financial_periods where year = 2025$q$, 'ZM011');
select t('change locked period year 2025->2024', $q$update financial_periods set year = 2024 where year = 2025$q$, 'ZM011');
select t('reopen 2025 (audited update)', $q$update financial_periods set status = 'open' where year = 2025$q$, 'ok');
select t('edit 2025 after reopen', $q$update financial_transactions set amount = 12 where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t('delete open (unlocked) period row', $q$delete from financial_periods where year = 2025$q$, 'ok');
select t('relock 2025', $q$insert into financial_periods (account_id, year, status) values ('a0000000-0000-0000-0000-00000000000a', 2025, 'locked')$q$, 'ok');
-- 2018 (historical year) boundaries
select t('lock 2018', $q$insert into financial_periods (account_id, year, status) values ('a0000000-0000-0000-0000-00000000000a', 2018, 'locked')$q$, 'ok');
select t('insert 2018-12-31 into locked 2018', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','insurance','Card',600,'2018-12-31')$q$, 'ZM010');
select t('insert 2018-01-01 into locked 2018', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','income','rents_received','Bank',1200,'2018-01-01')$q$, 'ZM010');
select t('insert 2017-12-31 next to locked 2018', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',5,'2017-12-31')$q$, 'ok');
select t('insert 2019-01-01 next to locked 2018', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','taxes','Card',450,'2019-01-01')$q$, 'ok');
select t('move 2019 row back into locked 2018', $q$update financial_transactions set transaction_date = '2018-12-31' where amount = 450$q$, 'ZM010');
-- cross-account: user A cannot touch B, and B's lock does not affect A
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000b';
select t('B locks its own 2026', $q$insert into financial_periods (account_id, year, status) values ('b0000000-0000-0000-0000-00000000000b', 2026, 'locked')$q$, 'ok');
select t('B cannot insert into A account', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',5,'2026-03-01')$q$, '42501');
select t('B cannot reopen A 2025 (0 rows visible)', $q$do $d$ begin update financial_periods set status='open' where account_id='a0000000-0000-0000-0000-00000000000a'; if not found then raise exception 'no rows' using errcode='P0002'; end if; end $d$$q$, 'P0002');
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
select t('A 2026 unaffected by B lock', $q$update financial_transactions set amount = 22 where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t('A cannot set B account on own row', $q$update financial_transactions set account_id = 'b0000000-0000-0000-0000-00000000000b' where id = 'c0000000-0000-0000-0000-000000000002'$q$, '42501');
-- M4 same-account payer references (bypassing the UI)
select t('A tenant payer on A income', $q$insert into financial_transactions (id,account_id,property_id,entry_type,category,payment_method,amount,transaction_date,tenant_id) values ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','income','rents_received','Bank',30,'2026-02-01','a3000000-0000-0000-0000-00000000000a')$q$, 'ok');
select t('A row with B tenant rejected', $q$update financial_transactions set tenant_id = 'b3000000-0000-0000-0000-00000000000b' where id = 'c0000000-0000-0000-0000-000000000003'$q$, 'ZM002');
select t('A row with B vendor rejected', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date,vendor_id) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',5,'2026-03-01','b2000000-0000-0000-0000-00000000000b')$q$, 'ZM002');
select t('A row on B property rejected', $q$insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','b1000000-0000-0000-0000-00000000000b','expense','repairs','Card',5,'2026-03-01')$q$, 'ZM002');
select t('vendor+tenant both set rejected (existing rule)', $q$update financial_transactions set vendor_id = 'a2000000-0000-0000-0000-00000000000a' where id = 'c0000000-0000-0000-0000-000000000003'$q$, '23514');
-- guard functions are not callable as RPCs
select t('guard fn not callable', $q$select block_locked_period_transaction_edits()$q$, '42501');
select t('period guard fn not callable', $q$select guard_financial_period_changes()$q$, '42501');
reset role;
\echo '--- audit rows for financial_periods (expect reopen + relock only on updates):'
select table_name, field_name, old_value, new_value from audit_log where table_name = 'financial_periods' order by changed_at;
