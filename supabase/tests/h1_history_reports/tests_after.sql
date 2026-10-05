-- T1's ACTUAL H2 migration. Every query below is the exact SQL of H1's PostgREST requests.
\set QUIET on
select a('A0 real migration applied: H1 read columns exist with H1''s names', $q$(select count(*) = 5 from information_schema.columns where table_name = 'mortgage_history_payments' and column_name in ('account_id','property_id','payment_date','principal_amount','voided'))$q$);
\i session_a.sql
select a('A1 member A, H1 all-time: own non-voided rows only (3), principal 751.50', $q$(select count(*) = 3 and sum(principal_amount) = 751.50 from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q)$q$);
select a('A2 member A, H1 year 2025: 1 row, principal 301', $q$(select count(*) = 1 and sum(principal_amount) = 301 from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false and payment_date >= '2025-01-01' and payment_date <= '2025-12-31') q)$q$);
select a('A3 disclosure totals per property: A Ct 601.00, A2 Ct 150.50', $q$(select array_agg(property_id::text || '=' || s order by property_id) = array['a2b00000-0000-0000-0000-00000000000b=601.00','a2b20000-0000-0000-0000-00000000000b=150.50'] from (select property_id, sum(principal_amount) s from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q group by 1) g)$q$);
select a('A4 the voided row exists (member voided it) and H1 excludes it', $q$(select count(*) = 1 from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided and principal_amount = 999) and (select count(*) = 0 from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q where principal_amount = 999)$q$);
select a('A5 account isolation: member A sees no account B rows, even when asking for them', $q$(select count(*) = 0 from mortgage_history_payments where account_id = 'b2b00000-0000-0000-0000-00000000000b')$q$);
select t('A6 member A cannot create history in account B', $q$insert into mortgage_history_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('b2b00000-0000-0000-0000-00000000000b', 'b2b10000-0000-0000-0000-00000000000b', '2023-01-01', 600, 1, 599)$q$, '42501');
select t('A7 members cannot delete history (append-only)', $q$delete from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a'$q$, '42501');
select a('A8 existing payments query unchanged: 200 (history never mixed in)', $q$(select sum(principal_amount) = 200 from (select property_id, principal_amount from mortgage_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q)$q$);
select a('A9 history entries changed no loan figure (balance, version, epoch, as-of)', $q$not exists (select 1 from mortgage_details d join t2_proof.loans_before b using (id) where (d.current_balance, d.escrow_balance, d.principal_version, d.principal_epoch, d.principal_as_of) is distinct from (b.current_balance, b.escrow_balance, b.principal_version, b.principal_epoch, b.principal_as_of))$q$);
select a('A10 escrow history exists but H1 never reads it (separate table)', $q$(select count(*) = 1 from mortgage_history_escrow where account_id = 'a2a00000-0000-0000-0000-00000000000a')$q$);
reset role;
\i session_b.sql
select a('A11 member B, H1 query for B: only its own row (77)', $q$(select count(*) = 1 and sum(principal_amount) = 77 from mortgage_history_payments where account_id = 'b2b00000-0000-0000-0000-00000000000b' and voided = false)$q$);
select a('A12 member B sees none of account A', $q$(select count(*) = 0 from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a')$q$);
reset role;
set role anon;
select t('A13 anon cannot read', $q$select 1 from mortgage_history_payments$q$, '42501');
reset role;
