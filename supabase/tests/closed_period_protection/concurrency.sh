#!/bin/bash
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 55433 -U postgres -d zmr -X -q"
pre="set role authenticated; set request.jwt.claim.sub='aaaaaaaa-0000-0000-0000-00000000000a';"
ins() { echo "insert into financial_transactions (account_id,property_id,entry_type,category,payment_method,amount,transaction_date) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-00000000000a','expense','repairs','Card',$1,'$2');"; }
ts() { date +%H:%M:%S; }
echo "C1: write in flight (2027), lock requested 1s later"
( $PSQL -c "$pre begin; $(ins 71 2027-05-01) select pg_sleep(3); commit;" ; echo "  [W committed $(ts)]" ) &
sleep 1; echo "  [L start $(ts)]"; $PSQL -c "$pre insert into financial_periods (account_id,year,status) values ('a0000000-0000-0000-0000-00000000000a',2027,'locked');" && echo "  [L done $(ts)]"; wait
echo "C2: lock in flight (2028), write requested 1s later"
( $PSQL -c "$pre begin; insert into financial_periods (account_id,year,status) values ('a0000000-0000-0000-0000-00000000000a',2028,'locked'); select pg_sleep(3); commit;"; echo "  [L committed $(ts)]" ) &
sleep 1; echo "  [W start $(ts)]"; $PSQL -c "$pre $(ins 72 2028-05-01)" 2>&1 | sed 's/^/  /'; echo "  [W returned $(ts)]"; wait
echo "C3: reopen in flight then rolled back (2028), write requested 1s later"
( $PSQL -c "$pre begin; update financial_periods set status='open' where year=2028; select pg_sleep(2); rollback;"; echo "  [reopen rolled back $(ts)]" ) &
sleep 1; $PSQL -c "$pre $(ins 73 2028-06-01)" 2>&1 | sed 's/^/  /'; echo "  [W returned $(ts)]"; wait
echo "C4: moving a 2026 row into 2029 while a 2029 lock is in flight"
( $PSQL -c "$pre begin; insert into financial_periods (account_id,year,status) values ('a0000000-0000-0000-0000-00000000000a',2029,'locked'); select pg_sleep(2); commit;" ) &
sleep 1; $PSQL -c "$pre update financial_transactions set transaction_date='2029-01-15' where id='c0000000-0000-0000-0000-000000000002';" 2>&1 | sed 's/^/  /'; wait
echo "Final state:"; $PSQL -At -c "select 'tx', amount, transaction_date from financial_transactions where amount in (71,72,73) order by amount;" -c "select 'period', year, status from financial_periods where year >= 2027 order by year;" -c "select 'moved?', transaction_date from financial_transactions where id='c0000000-0000-0000-0000-000000000002';" | sed 's/^/  /'
