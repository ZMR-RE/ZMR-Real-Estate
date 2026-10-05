-- Fictional fixtures for the disposable database only (T2 H1 proof). Live schema (before H2).
-- Two accounts; account A has two properties with loans, account B one.
\set QUIET on
set session_replication_role = replica;
insert into auth.users (id, email) values
 ('a2000000-0000-0000-0000-00000000000a', 't2-owner-a@example.test'),
 ('b2000000-0000-0000-0000-00000000000b', 't2-owner-b@example.test');
insert into accounts (id, name) values ('a2a00000-0000-0000-0000-00000000000a', 'ZMR-TEST-T2 H1 A'), ('b2b00000-0000-0000-0000-00000000000b', 'ZMR-TEST-T2 H1 B');
insert into account_members (account_id, user_id, role) values
 ('a2a00000-0000-0000-0000-00000000000a', 'a2000000-0000-0000-0000-00000000000a', 'owner'),
 ('b2b00000-0000-0000-0000-00000000000b', 'b2000000-0000-0000-0000-00000000000b', 'owner');
insert into properties (id, account_id, name) values
 ('a2b00000-0000-0000-0000-00000000000b', 'a2a00000-0000-0000-0000-00000000000a', '1 ZMR-TEST-T2 A Ct'),
 ('a2b20000-0000-0000-0000-00000000000b', 'a2a00000-0000-0000-0000-00000000000a', '3 ZMR-TEST-T2 A2 Ct'),
 ('b2b10000-0000-0000-0000-00000000000b', 'b2b00000-0000-0000-0000-00000000000b', '2 ZMR-TEST-T2 B Ct');
insert into mortgage_details (id, account_id, property_id, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years) values
 ('a2c00000-0000-0000-0000-00000000000c', 'a2a00000-0000-0000-0000-00000000000a', 'a2b00000-0000-0000-0000-00000000000b', 240000, 212000, 6.25, 1477.72, '2019-06-01', 30),
 ('a2c20000-0000-0000-0000-00000000000c', 'a2a00000-0000-0000-0000-00000000000a', 'a2b20000-0000-0000-0000-00000000000b', 150000, 140000, 5.5, 900, '2021-01-01', 30),
 ('b2c00000-0000-0000-0000-00000000000c', 'b2b00000-0000-0000-0000-00000000000b', 'b2b10000-0000-0000-0000-00000000000b', 100000, 90000, 5, 600, '2020-01-01', 30);
insert into mortgage_payments (id, account_id, property_id, payment_date, amount, principal_amount, interest_amount) values
 ('a2d00000-0000-0000-0000-000000000001', 'a2a00000-0000-0000-0000-00000000000a', 'a2b00000-0000-0000-0000-00000000000b', '2025-03-01', 1200, 200, 1000);
set session_replication_role = origin;
