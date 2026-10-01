\set QUIET on
-- ---- no backfill: the migration changed no existing row
select check_true($n$existing transactions start unresolved (no backfill)$n$, (select count(*) = 0 from financial_transactions where responsible_entity_id is not null));

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
-- ---- suggestion: sole dated owner only
select check_true($n$sole 100% owner on the date is suggested$n$, (select suggested_transaction_entity('a1000000-0000-0000-0000-0000000000a1','2025-05-01') = 'e1000000-0000-0000-0000-0000000000e1'));
select check_true($n$…the first day of the interest counts$n$, (select suggested_transaction_entity('a1000000-0000-0000-0000-0000000000a1','2020-01-01') = 'e1000000-0000-0000-0000-0000000000e1'));
select check_true($n$no suggestion before the owner's start date$n$, (select suggested_transaction_entity('a1000000-0000-0000-0000-0000000000a1','2019-12-31') is null));
select check_true($n$shared ownership: no suggestion$n$, (select suggested_transaction_entity('a2000000-0000-0000-0000-0000000000a2','2025-05-02') is null));
select check_true($n$unknown start date: no suggestion$n$, (select suggested_transaction_entity('a3000000-0000-0000-0000-0000000000a3','2025-05-01') is null));
select check_true($n$changed hands: the owner on the date before the change$n$, (select suggested_transaction_entity('a4000000-0000-0000-0000-0000000000a4','2024-06-30') = 'e1000000-0000-0000-0000-0000000000e1'));
select check_true($n$changed hands: the owner on the date after the change$n$, (select suggested_transaction_entity('a4000000-0000-0000-0000-0000000000a4','2024-07-01') = 'e2000000-0000-0000-0000-0000000000e2'));
select check_true($n$known partial share (60%): no suggestion$n$, (select suggested_transaction_entity('a5000000-0000-0000-0000-0000000000a5','2025-05-01') is null));
select check_true($n$no ownership recorded: no suggestion$n$, (select suggested_transaction_entity('a6000000-0000-0000-0000-0000000000a6','2025-05-01') is null));
select check_true($n$sole owner with no percentage given is suggested$n$, (select suggested_transaction_entity('a7000000-0000-0000-0000-0000000000a7','2025-05-01') = 'e2000000-0000-0000-0000-0000000000e2'));
select check_true($n$another workspace's property yields no suggestion$n$, (select suggested_transaction_entity('b1000000-0000-0000-0000-0000000000b1','2025-05-01') is null));

-- ---- the server never fills it in
select t($n$a new transaction on a sole-owner property saves with no entity$n$, $q$insert into financial_transactions (id, account_id, property_id, entry_type, category, payment_method, amount, transaction_date) values ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',30,'2025-06-01')$q$, 'ok');
select check_true($n$…and stays unresolved (nothing auto-assigned)$n$, (select responsible_entity_id is null from financial_transactions where id = 'c0000000-0000-0000-0000-000000000003'));
select check_true($n$Needs-entity list shows all three active unresolved rows$n$, (select count(*) = 3 from financial_transactions where responsible_entity_id is null and not voided));

-- ---- explicit confirmation
select t($n$owner confirms E1 on T1$n$, $q$update financial_transactions set responsible_entity_id = 'e1000000-0000-0000-0000-0000000000e1' where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select check_true($n$…the confirmation is in the audit trail$n$, (select count(*) = 1 from audit_log where record_id = 'c0000000-0000-0000-0000-000000000001' and field_name = 'responsible_entity_id' and old_value is null and new_value = 'e1000000-0000-0000-0000-0000000000e1' and changed_by = 'aaaaaaaa-0000-0000-0000-00000000000a'));
select t($n$a shared-property transaction can be assigned explicitly to either owner$n$, $q$update financial_transactions set responsible_entity_id = 'e2000000-0000-0000-0000-0000000000e2' where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ok');
select check_true($n$Needs-entity list shrinks to the one unresolved row$n$, (select count(*) = 1 from financial_transactions where responsible_entity_id is null and not voided));
select t($n$an older client's edit (no entity column) keeps the confirmed entity$n$, $q$update financial_transactions set description = 'edited by old client', amount = 11 where id = 'c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select check_true($n$…E1 is still set$n$, (select responsible_entity_id = 'e1000000-0000-0000-0000-0000000000e1' from financial_transactions where id = 'c0000000-0000-0000-0000-000000000001'));
select t($n$the entity can be cleared back to unresolved$n$, $q$update financial_transactions set responsible_entity_id = null where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'ok');

-- ---- workspace isolation
select t($n$another workspace's entity is refused$n$, $q$update financial_transactions set responsible_entity_id = 'eb000000-0000-0000-0000-0000000000eb' where id = 'c0000000-0000-0000-0000-000000000003'$q$, 'ZM002');
select t($n$…also on insert$n$, $q$insert into financial_transactions (account_id, property_id, entry_type, category, payment_method, amount, transaction_date, responsible_entity_id) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',5,'2025-06-02','eb000000-0000-0000-0000-0000000000eb')$q$, 'ZM002');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000b';
select check_true($n$user B cannot see A's transactions or their entities$n$, (select count(*) = 1 from financial_transactions));
select check_true($n$user B gets no suggestion for A's property$n$, (select suggested_transaction_entity('a1000000-0000-0000-0000-0000000000a1','2025-05-01') is null));
reset role;

-- ---- an entity in use cannot be deleted
select t($n$deleting an entity a transaction uses is refused$n$, $q$delete from llcs where id = 'e1000000-0000-0000-0000-0000000000e1'$q$, '23503');

-- ---- signed-out callers
set role anon;
select t($n$signed-out callers cannot ask for suggestions$n$, $q$select suggested_transaction_entity('a1000000-0000-0000-0000-0000000000a1','2025-05-01')$q$, '42501');
reset role;
