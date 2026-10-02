-- AFTER T1's real migrations (20261004100000 + 20261005100000 from H2 candidate 4317d43).
-- Statement dates are set by the superuser as fixture setup (in the app this is the balance-update flow).
-- History rows are then created BY SIGNED-IN MEMBERS through plain inserts, so T1's real insert trigger
-- (membership, active loan, statement date, duplicate rule, declared_as_of from the loan) runs.
\set QUIET on
update mortgage_details set principal_as_of = '2025-06-30', escrow_as_of = '2025-06-30' where account_id in ('a2a00000-0000-0000-0000-00000000000a', 'b2b00000-0000-0000-0000-00000000000b');
create schema t2_proof;
create table t2_proof.loans_before as select id, current_balance, escrow_balance, principal_version, principal_epoch, principal_as_of from mortgage_details;
grant usage on schema t2_proof to authenticated;
grant select on t2_proof.loans_before to authenticated;
\i session_a.sql
insert into mortgage_history_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values
 ('a2a00000-0000-0000-0000-00000000000a', 'a2b00000-0000-0000-0000-00000000000b', '2023-04-01', 1200, 300, 900),
 ('a2a00000-0000-0000-0000-00000000000a', 'a2b00000-0000-0000-0000-00000000000b', '2025-04-01', 1200.5, 301, 899.5),
 ('a2a00000-0000-0000-0000-00000000000a', 'a2b00000-0000-0000-0000-00000000000b', '2023-05-01', 1200, 999, 201),
 ('a2a00000-0000-0000-0000-00000000000a', 'a2b20000-0000-0000-0000-00000000000b', '2024-07-01', 900, 150.5, 749.5);
update mortgage_history_payments set voided = true, void_reason = 'ZMR-TEST-T2 entered twice' where payment_date = '2023-05-01';
insert into mortgage_history_escrow (account_id, property_id, transaction_date, transaction_type, amount, description) values
 ('a2a00000-0000-0000-0000-00000000000a', 'a2b00000-0000-0000-0000-00000000000b', '2024-12-01', 'deposit', 412.5, 'ZMR-TEST-T2 escrow history');
reset role;
\i session_b.sql
insert into mortgage_history_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values
 ('b2b00000-0000-0000-0000-00000000000b', 'b2b10000-0000-0000-0000-00000000000b', '2023-04-01', 600, 77, 523);
reset role;
