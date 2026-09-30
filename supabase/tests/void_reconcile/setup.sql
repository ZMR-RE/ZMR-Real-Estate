-- Fictional fixtures for the disposable database only (never Practice/production).
insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','zmr-test-a@example.test'),
 ('bbbbbbbb-0000-0000-0000-00000000000b','zmr-test-b@example.test');
insert into accounts (id, name) values
 ('a0000000-0000-0000-0000-00000000000a','ZMR-TEST A'),('b0000000-0000-0000-0000-00000000000b','ZMR-TEST B');
insert into account_members (account_id, user_id, role) values
 ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','owner'),
 ('b0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-00000000000b','owner');
insert into properties (id, account_id, address) values
 ('a1000000-0000-0000-0000-0000000000a1','a0000000-0000-0000-0000-00000000000a','1 ZMR-TEST Maple Ln'),
 ('b1000000-0000-0000-0000-0000000000b1','b0000000-0000-0000-0000-00000000000b','1 ZMR-TEST B St');
-- T1..T8 ordinary entries in account A; TB in account B.
insert into financial_transactions (id, account_id, property_id, entry_type, category, payment_method, amount, transaction_date) values
 ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',10,'2025-10-01'),
 ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',20,'2025-10-02'),
 ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',30,'2025-10-03'),
 ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',40,'2025-10-04'),
 ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',50,'2025-10-05'),
 ('c0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',60,'2025-10-06'),
 ('c0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',70,'2025-10-07'),
 ('c0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',80,'2025-10-08'),
 ('cb000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-0000000000b1','expense','repairs','Checking',90,'2025-10-09');
-- A LEGACY conflict (voided and matched before the safeguard existed),
-- seeded with triggers bypassed to model pre-existing production data.
set session_replication_role = replica;
insert into financial_transactions (id, account_id, property_id, entry_type, category, payment_method, amount, transaction_date, voided, voided_at, statement_reconciled) values
 ('c0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',99,'2025-09-09',true,now(),true),
 ('cb000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-0000000000b1','expense','repairs','Checking',98,'2025-09-08',true,now(),true);
set session_replication_role = origin;
create or replace function t(name text, stmt text, expect text) returns void language plpgsql as $$
begin
  execute stmt;
  if expect = 'ok' then raise notice 'PASS %', name; else raise notice 'FAIL % (expected %, succeeded)', name, expect; end if;
exception when others then
  if expect <> 'ok' and sqlstate = expect then raise notice 'PASS % [%]', name, sqlstate;
  else raise notice 'FAIL % (expected %, got % %)', name, expect, sqlstate, sqlerrm; end if;
end $$;
create or replace function check_true(name text, cond boolean) returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS %', name; else raise notice 'FAIL % (condition false)', name; end if;
end $$;
grant execute on function t(text,text,text), check_true(text,boolean) to authenticated;
