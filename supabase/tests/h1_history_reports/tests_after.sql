-- Stand-in history table (contract v5 §3 shape; RLS/grants mirror mortgage_payments).
\set QUIET on
\i session_a.sql
select a('A1 member A all-time: own non-voided rows only (2), principal 601', $q$(select count(*) = 2 and sum(principal_amount) = 601 from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q)$q$);
select a('A2 member A year 2025: 1 row, principal 301', $q$(select count(*) = 1 and sum(principal_amount) = 301 from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false and payment_date >= '2025-01-01' and payment_date <= '2025-12-31') q)$q$);
select a('A3 member A cannot read account B rows (explicit filter)', $q$(select count(*) = 0 from mortgage_history_payments where account_id = 'b2b00000-0000-0000-0000-00000000000b')$q$);
select a('A4 voided history row excluded by the H1 filter', $q$(select count(*) = 0 from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q where principal_amount = 999)$q$);
select t('A5 member A cannot write into account B', $q$insert into mortgage_history_payments (account_id, property_id, mortgage_id, payment_date, amount, principal_amount, interest_amount, declared_as_of) values ('b2b00000-0000-0000-0000-00000000000b', 'b2b10000-0000-0000-0000-00000000000b', 'b2c00000-0000-0000-0000-00000000000c', '2023-01-01', 600, 1, 599, '2025-06-30')$q$, '42501');
select t('A6 no DELETE for members', $q$delete from mortgage_history_payments$q$, '42501');
select a('A7 existing payments query still 200 (history never mixed in)', $q$(select sum(principal_amount) = 200 from (select property_id, principal_amount from mortgage_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q)$q$);
reset role;
\i session_b.sql
select a('A8 member B sees only its own row (77)', $q$(select count(*) = 1 and sum(principal_amount) = 77 from mortgage_history_payments where voided = false)$q$);
reset role;
set role anon;
select t('A9 anon cannot read', $q$select 1 from mortgage_history_payments$q$, '42501');
reset role;
