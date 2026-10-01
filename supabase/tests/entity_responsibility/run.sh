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
# Rollback is data-preserving (T3 review): it withdraws only the suggestion
# function. Every confirmed assignment and every other value must survive
# the rollback AND a later re-apply of the (re-runnable) migration.
q() { $P -At -c "$1"; }
ASSIGN="select md5(coalesce(string_agg(id || '=' || responsible_entity_id, '|' order by id), '')) from financial_transactions where responsible_entity_id is not null"
ROWS="select md5(string_agg(t::text, '|' order by id)) from financial_transactions t"
N_ASSIGNED=$(q "select count(*) from financial_transactions where responsible_entity_id is not null")
A0=$(q "$ASSIGN"); R0=$(q "$ROWS")
$P -v ON_ERROR_STOP=1 -f "$REPO/supabase/rollback/20261003100000_transaction_responsible_entity_down.sql" >/dev/null 2>&1
A1=$(q "$ASSIGN"); R1=$(q "$ROWS")
FN=$(q "select count(*) from pg_proc where proname = 'suggested_transaction_entity'")
COL=$(q "select count(*) from information_schema.columns where table_name = 'financial_transactions' and column_name = 'responsible_entity_id'")
chk() { if [ "$2" = yes ]; then OUT="$OUT
PASS $1"; else OUT="$OUT
FAIL $1"; fi; }
chk "rollback keeps all $N_ASSIGNED confirmed assignments and every row unchanged" "$([ "$N_ASSIGNED" -ge 2 ] && [ "$A0" = "$A1" ] && [ "$R0" = "$R1" ] && echo yes)"
chk "rollback withdraws only the suggestion function (column kept)" "$([ "$FN" = 0 ] && [ "$COL" = 1 ] && echo yes)"
# An older frontend after the rollback: its edit keeps the assignment.
q "set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a'; update financial_transactions set description = 'old client after rollback' where id = 'c0000000-0000-0000-0000-000000000001'" >/dev/null 2>&1
chk "after rollback, an older client's edit keeps the confirmed entity" "$([ "$(q "select responsible_entity_id from financial_transactions where id = 'c0000000-0000-0000-0000-000000000001'")" = e1000000-0000-0000-0000-0000000000e1 ] && echo yes)"
chk "after rollback, another workspace's entity is still refused" "$(q "set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a'; update financial_transactions set responsible_entity_id = 'eb000000-0000-0000-0000-0000000000eb' where id = 'c0000000-0000-0000-0000-000000000003'" 2>&1 | grep -q 'cross-account' && echo yes)"
# Re-apply the migration (as after `migration repair --status reverted`).
A2=$(q "$ASSIGN")
if $P -v ON_ERROR_STOP=1 -f "$REPO/supabase/migrations/20261003100000_transaction_responsible_entity.sql" >/dev/null 2>&1; then REAPPLY=yes; else REAPPLY=no; fi
A3=$(q "$ASSIGN")
SUG=$(q "set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a'; select suggested_transaction_entity('a1000000-0000-0000-0000-0000000000a1','2025-05-01')" | tail -1)
chk "re-applying the migration succeeds and keeps every assignment" "$([ "$REAPPLY" = yes ] && [ "$A2" = "$A3" ] && [ "$A0" = "$A3" ] && echo yes)"
chk "…and restores the suggestion" "$([ "$SUG" = e1000000-0000-0000-0000-0000000000e1 ] && echo yes)"
echo "$OUT"
PASS=$(grep -c '^PASS' <<<"$OUT"); FAIL=$(grep -c '^FAIL' <<<"$OUT")
echo "== $PASS passed, $FAIL failed"
$PG/pg_ctl -D "$D/data" stop -m fast >/dev/null
rm -rf "$D/data"
[ "$FAIL" -eq 0 ]
