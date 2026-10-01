-- Fictional fixtures for the disposable database only (never Practice/production).
insert into auth.users (id, email) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','zmr-test-a@example.test'),
 ('bbbbbbbb-0000-0000-0000-00000000000b','zmr-test-b@example.test');
insert into accounts (id, name) values
 ('a0000000-0000-0000-0000-00000000000a','ZMR-TEST A'),('b0000000-0000-0000-0000-00000000000b','ZMR-TEST B');
insert into account_members (account_id, user_id, role) values
 ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','owner'),
 ('b0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-00000000000b','owner');
-- Entities: E1, E2 in A; EB in B.
insert into llcs (id, account_id, name) values
 ('e1000000-0000-0000-0000-0000000000e1','a0000000-0000-0000-0000-00000000000a','ZMR-TEST E1 LLC'),
 ('e2000000-0000-0000-0000-0000000000e2','a0000000-0000-0000-0000-00000000000a','ZMR-TEST E2 LLC'),
 ('eb000000-0000-0000-0000-0000000000eb','b0000000-0000-0000-0000-00000000000b','ZMR-TEST EB LLC');
-- P1 sole owner E1 (100%, from 2020); P2 shared E1/E2 50/50; P3 E1 with an
-- unknown start; P4 E1 until 2024-06-30 then E2; P5 E1 at a known 60%;
-- P6 no ownership recorded; P7 sole owner E2 with no percentage given.
insert into properties (id, account_id, address) values
 ('a1000000-0000-0000-0000-0000000000a1','a0000000-0000-0000-0000-00000000000a','1 ZMR-TEST Sole St'),
 ('a2000000-0000-0000-0000-0000000000a2','a0000000-0000-0000-0000-00000000000a','2 ZMR-TEST Shared St'),
 ('a3000000-0000-0000-0000-0000000000a3','a0000000-0000-0000-0000-00000000000a','3 ZMR-TEST Undated St'),
 ('a4000000-0000-0000-0000-0000000000a4','a0000000-0000-0000-0000-00000000000a','4 ZMR-TEST Sold St'),
 ('a5000000-0000-0000-0000-0000000000a5','a0000000-0000-0000-0000-00000000000a','5 ZMR-TEST Partial St'),
 ('a6000000-0000-0000-0000-0000000000a6','a0000000-0000-0000-0000-00000000000a','6 ZMR-TEST Unowned St'),
 ('a7000000-0000-0000-0000-0000000000a7','a0000000-0000-0000-0000-00000000000a','7 ZMR-TEST NoPct St'),
 ('a8000000-0000-0000-0000-0000000000a8','a0000000-0000-0000-0000-00000000000a','8 ZMR-TEST Ended-undated St'),
 ('a9000000-0000-0000-0000-0000000000a9','a0000000-0000-0000-0000-00000000000a','9 ZMR-TEST Ended-undated Then-sole St'),
 ('b1000000-0000-0000-0000-0000000000b1','b0000000-0000-0000-0000-00000000000b','1 ZMR-TEST B St');
insert into property_ownership_interests (account_id, property_id, llc_id, percentage, effective_date, end_date, is_current) values
 ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','e1000000-0000-0000-0000-0000000000e1',100,'2020-01-01',null,true),
 ('a0000000-0000-0000-0000-00000000000a','a2000000-0000-0000-0000-0000000000a2','e1000000-0000-0000-0000-0000000000e1',50,'2020-01-01',null,true),
 ('a0000000-0000-0000-0000-00000000000a','a2000000-0000-0000-0000-0000000000a2','e2000000-0000-0000-0000-0000000000e2',50,'2020-01-01',null,true),
 ('a0000000-0000-0000-0000-00000000000a','a3000000-0000-0000-0000-0000000000a3','e1000000-0000-0000-0000-0000000000e1',100,null,null,true),
 ('a0000000-0000-0000-0000-00000000000a','a4000000-0000-0000-0000-0000000000a4','e1000000-0000-0000-0000-0000000000e1',100,'2020-01-01','2024-06-30',false),
 ('a0000000-0000-0000-0000-00000000000a','a4000000-0000-0000-0000-0000000000a4','e2000000-0000-0000-0000-0000000000e2',100,'2024-07-01',null,true),
 ('a0000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-0000000000a5','e1000000-0000-0000-0000-0000000000e1',60,'2020-01-01',null,true),
 ('a0000000-0000-0000-0000-00000000000a','a7000000-0000-0000-0000-0000000000a7','e2000000-0000-0000-0000-0000000000e2',null,'2021-03-01',null,true),
 -- T3 blocker: an interest marked no longer current with NO end date. P8:
 -- the only interest ended at an unknown time. P9: an ended-undated E1
 -- followed by a current sole E2 from 2024.
 ('a0000000-0000-0000-0000-00000000000a','a8000000-0000-0000-0000-0000000000a8','e1000000-0000-0000-0000-0000000000e1',100,'2020-01-01',null,false),
 ('a0000000-0000-0000-0000-00000000000a','a9000000-0000-0000-0000-0000000000a9','e1000000-0000-0000-0000-0000000000e1',100,'2020-01-01',null,false),
 ('a0000000-0000-0000-0000-00000000000a','a9000000-0000-0000-0000-0000000000a9','e2000000-0000-0000-0000-0000000000e2',100,'2024-01-01',null,true),
 ('b0000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-0000000000b1','eb000000-0000-0000-0000-0000000000eb',100,'2020-01-01',null,true);
-- Existing transactions before any entity work (T1 on the sole-owner property).
insert into financial_transactions (id, account_id, property_id, entry_type, category, payment_method, amount, transaction_date) values
 ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',10,'2025-05-01'),
 ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-00000000000a','a2000000-0000-0000-0000-0000000000a2','expense','repairs','Checking',20,'2025-05-02'),
 ('c0000000-0000-0000-0000-000000000024','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-0000000000a1','expense','repairs','Checking',24,'2024-03-01'),
 ('cb000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-0000000000b1','expense','repairs','Checking',90,'2025-05-03');
-- 2024 is closed (M6) for account A.
insert into financial_periods (account_id, year, status) values ('a0000000-0000-0000-0000-00000000000a', 2024, 'locked');
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
grant execute on function t(text,text,text), check_true(text,boolean) to authenticated, anon;
