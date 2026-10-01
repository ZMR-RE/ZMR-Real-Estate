#!/bin/bash
# Disposable-database tests for the transaction responsible entity. Never
# points at Practice or production: a throwaway PG17 cluster on
# 127.0.0.1:${ZMR_TEST_PGPORT:-55433}; the build refuses a port in use.
# usage: run.sh <repo>
set -u
REPO=${1:-$(cd "$(dirname "$0")/../../.." && pwd)}
D=$(dirname "$0"); PG=/opt/homebrew/opt/postgresql@17/bin
P="$PG/psql -h 127.0.0.1 -p ${ZMR_TEST_PGPORT:-55433} -U postgres -d zmr -q"
bash "$D/build.sh" "$REPO" || exit 1
$P -v ON_ERROR_STOP=1 -f "$D/setup.sql" >/dev/null || exit 1
# Any SQL error outside a t()/check_true() wrapper is reported as a FAIL.
run() { $P -f "$1" 2>&1 | sed -n -e 's/^psql:[^:]*:[0-9]*: NOTICE:  //p' -e 's/^psql:\([^:]*:[0-9]*\): ERROR:  \(.*\)/FAIL SQL error at \1: \2/p'; }
OUT=$(run "$D/tests.sql")
# Rollback: removes the column, function and check; every other value of
# every transaction is unchanged.
COLS="id, account_id, property_id, entry_type, category, amount, transaction_date, description, voided, statement_reconciled"
BEFORE=$($P -At -c "select md5(string_agg(row($COLS)::text, '|' order by id)) from financial_transactions")
$P -v ON_ERROR_STOP=1 -f "$REPO/supabase/rollback/20261003100000_transaction_responsible_entity_down.sql" >/dev/null 2>&1
AFTER=$($P -At -c "select md5(string_agg(row($COLS)::text, '|' order by id)) from financial_transactions")
GONE=$($P -At -c "select (select count(*) from information_schema.columns where table_name = 'financial_transactions' and column_name = 'responsible_entity_id') + (select count(*) from pg_proc where proname = 'suggested_transaction_entity')")
STILL=$($P -At -c "do \$\$ begin begin insert into financial_transactions (account_id, property_id, entry_type, category, payment_method, amount, transaction_date) values ('a0000000-0000-0000-0000-00000000000a','b1000000-0000-0000-0000-0000000000b1','expense','repairs','Checking',1,'2025-01-01'); raise exception 'accepted'; exception when sqlstate 'ZM002' then raise notice 'refused'; end; end \$\$" 2>&1)
if [ "$BEFORE" = "$AFTER" ] && [ "$GONE" = 0 ] && grep -q refused <<<"$STILL"; then OUT="$OUT
PASS rollback removes the column and function, keeps the same-workspace check, changes no other values"; else OUT="$OUT
FAIL rollback ($BEFORE/$AFTER gone=$GONE $STILL)"; fi
echo "$OUT"
PASS=$(grep -c '^PASS' <<<"$OUT"); FAIL=$(grep -c '^FAIL' <<<"$OUT")
echo "== $PASS passed, $FAIL failed"
$PG/pg_ctl -D "$D/data" stop -m fast >/dev/null
rm -rf "$D/data"
[ "$FAIL" -eq 0 ]
