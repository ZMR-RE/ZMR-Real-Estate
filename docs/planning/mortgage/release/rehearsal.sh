#!/bin/bash
# Local rehearsal of the integrity release checks (T1). Disposable Postgres 17; never touches Practice or production.
# Live schema = this checkout's migrations except 20261004100000 (119); fictional data shaped like production.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../../.." && pwd)
PORT=${ZMR_REL_PGPORT:-55491}; PG=/opt/homebrew/opt/postgresql@17/bin
NEW="$REPO/supabase/migrations/20261004100000_mortgage_balance_integrity.sql"
WORK=$(mktemp -d /tmp/zmr-integrity-release.XXXXXX)
cleanup() { $PG/pg_ctl -D "$WORK/data" stop -m fast >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT
FAIL=0; r() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  [expected '$3' got '$2']"; FAIL=1; fi; }
lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1 && { echo "port $PORT busy"; exit 2; }
$PG/initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null || exit 2
$PG/pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" start >/dev/null || exit 2; sleep 1
P="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -X -q"
$P -d postgres -c "create database tmpl" >/dev/null
Q="$P -t -A -d tmpl"
$Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/tests/entity_responsibility/bootstrap.sql" >/dev/null || exit 2
for f in "$REPO"/supabase/migrations/*.sql; do [ "$f" = "$NEW" ] && continue
  $Q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>"$WORK/err" || { echo "FAILED: $f"; cat "$WORK/err"; exit 2; }; done
VERS=$(ls "$REPO"/supabase/migrations/*.sql | grep -v 20261004100000 | sed -E 's#.*/([0-9]{14})_.*#\1#' | tr '\n' ',' | sed 's/,$//')
$Q -v ON_ERROR_STOP=1 >/dev/null <<SQL || exit 2
create schema supabase_migrations;
create table supabase_migrations.schema_migrations (version text primary key, name text, statements text[]);
insert into supabase_migrations.schema_migrations (version) select unnest(string_to_array('$VERS', ','));
SQL
ACC=a0000000-0000-0000-0000-00000000000a; USR=a1000000-0000-0000-0000-00000000000a
P1=b1000000-0000-0000-0000-000000000001; P2=b1000000-0000-0000-0000-000000000002
$Q -v ON_ERROR_STOP=1 >/dev/null <<SQL || exit 2
insert into auth.users (id, email) values ('$USR','zmr-test-rel@example.test');
insert into accounts (id, name) values ('$ACC','ZMR-TEST Release');
insert into account_members (account_id, user_id, role) values ('$ACC','$USR','owner');
insert into properties (id, account_id, address) values ('$P1','$ACC','2169 ZMR-TEST Ash'), ('$P2','$ACC','1 ZMR-TEST Other');
insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, interest_rate, monthly_payment, loan_start_date, term_years, voided, voided_at)
  values ('$ACC','$P1','ZMR-TEST Old Bank',200000,194556,6.5,1500,'2022-01-01',30,true,now());
insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$P1','ZMR-TEST Current Bank',85000,42952.07,0,3.625,387.64,'2020-06-01',30);
insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$P1','2026-09-01',387.64,257,130.64);
insert into mortgage_escrow_transactions (account_id, property_id, transaction_date, transaction_type, amount) values ('$ACC','$P1','2026-09-01','deposit',100);
insert into audit_log (account_id, table_name, record_id, field_name, old_value, new_value) values ('$ACC','properties','$P1','address','x','2169 ZMR-TEST Ash');
SQL
echo "== schema: $($Q -c 'select count(*) from supabase_migrations.schema_migrations') migrations; fixture loaded"
fresh() { $P -d postgres -c "drop database if exists t" -c "create database t template tmpl" >/dev/null; }
T="$P -d t"
apply() { $T -v ON_ERROR_STOP=1 -1 -f "$NEW" >/dev/null 2>"$WORK/err" && $T -c "insert into supabase_migrations.schema_migrations(version) values ('20261004100000')" >/dev/null; }
pre()  { $T -v ON_ERROR_STOP=1 -f "$HERE/integrity-release-pre.sql"  > "$WORK/out" 2>&1; echo $?; }
post() { $T -v ON_ERROR_STOP=1 -f "$HERE/integrity-release-post.sql" > "$WORK/out" 2>&1; echo $?; }
fp()   { $T -v ON_ERROR_STOP=1 -f "$HERE/integrity-release-fingerprint.sql" 2>&1; }

echo "== GO path"
fresh
r "preflight passes (read-only session)" "$(PGOPTIONS='-c default_transaction_read_only=on' $T -v ON_ERROR_STOP=1 -f "$HERE/integrity-release-pre.sql" 2>&1 | grep -c 'PREFLIGHT PASSED')" "1"
BEFORE=$(fp); r "fingerprint covers all base tables" "$( [ $(echo "$BEFORE" | wc -l) -gt 20 ] && echo yes)" "yes"
apply; r "migration applies" "$?" "0"
r "post-apply checks pass (read-only session)" "$(PGOPTIONS='-c default_transaction_read_only=on' $T -v ON_ERROR_STOP=1 -f "$HERE/integrity-release-post.sql" 2>&1 | grep -c 'POST-APPLY CHECKS PASSED')" "1"
r "existing fields identical after apply" "$(fp | md5)" "$(echo "$BEFORE" | md5)"

echo "== STOP paths"
fresh; apply; r "preflight STOPs when already applied" "$(pre)/$(grep -c 'STOP: expected 119' "$WORK/out")" "3/1"
fresh; $T -c "insert into mortgage_payments (id, account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('2a7b6825-10dc-44d7-a057-60918027c2fb','$ACC','$P1','2026-09-15',1500,444,1056)" >/dev/null
r "preflight STOPs if the Sep 15 rows are present" "$(pre)/$(grep -c 'STOP: the Sep 15 test entries' "$WORK/out")" "3/1"
fresh; $T -c "delete from supabase_migrations.schema_migrations where version = (select max(version) from supabase_migrations.schema_migrations)" >/dev/null
r "preflight STOPs on a different migration count" "$(pre)/$(grep -c 'STOP: expected 119' "$WORK/out")" "3/1"
fresh; apply; $T -c "update mortgage_details set principal_version = 1 where lender_name = 'ZMR-TEST Current Bank'" >/dev/null
r "post STOPs if a loan isn't backfilled as specified" "$(post)/$(grep -c 'STOP: 1 loan row' "$WORK/out")" "3/1"
fresh; apply; $T -c "alter table mortgage_payments disable trigger user; update mortgage_payments set mortgage_id = (select id from mortgage_details where not voided); alter table mortgage_payments enable trigger user" >/dev/null  # test-only tamper (the guard would refuse it)
r "post STOPs if an existing entry was linked" "$(post)/$(grep -c 'STOP: 1 existing payment' "$WORK/out")" "3/1"
fresh; BEFORE=$(fp); apply; $T -c "alter table mortgage_details disable trigger user; update mortgage_details set lender_name = 'changed' where lender_name = 'ZMR-TEST Old Bank'; alter table mortgage_details enable trigger user" >/dev/null
r "fingerprint detects a changed existing field" "$( [ "$(fp | md5)" != "$(echo "$BEFORE" | md5)" ] && echo detected)" "detected"
fresh; BEFORE=$(fp); apply; $T -c "insert into audit_log (account_id, table_name, record_id, field_name) values ('$ACC','properties','$P2','x')" >/dev/null
r "fingerprint detects an added audit row" "$( [ "$(fp | md5)" != "$(echo "$BEFORE" | md5)" ] && echo detected)" "detected"
echo; [ $FAIL = 0 ] && echo "ALL RELEASE-CHECK REHEARSALS PASSED" || echo "REHEARSAL FAILURES"; exit $FAIL
