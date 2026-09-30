#!/bin/bash
# Real concurrent sessions: both orders of Void vs statement match.
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p ${ZMR_TEST_PGPORT:-55433} -U postgres -d zmr -q -X"
A=a0000000-0000-0000-0000-00000000000a
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
session() { # $1 out, $2 sql, $3 seconds to hold open
  $PSQL -v VERBOSITY=verbose > "$1" 2>&1 <<SQL
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
begin;
$2;
select pg_sleep($3);
commit;
SQL
}
outcome() { local c; c=$(grep -oE 'ERROR:  [0-9A-Z]{5}' "$1" | head -1 | awk '{print $2}'); echo "${c:-ok}"; }
check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (expected $3, got $2)"; fi; }
sql() { $PSQL -At -c "$1"; }
VOID="update financial_transactions set voided = true, voided_at = now() where id ="
# The OLD reconciliation shape (no voided filter) — models any caller that
# does not filter; the database must still refuse it.
MATCH="update financial_transactions set statement_reconciled = true where account_id = '$A' and id ="
T6=c0000000-0000-0000-0000-000000000006; T7=c0000000-0000-0000-0000-000000000007; T8=c0000000-0000-0000-0000-000000000008

# 1. Void first (held open), then match: the match waits, then is refused.
session "$W/a" "$VOID '$T6'" 2 &
sleep 0.5
session "$W/b" "$MATCH '$T6'" 0 &
wait
check "void then match (racing): void commits" "$(outcome $W/a)" ok
check "void then match (racing): match refused after waiting" "$(outcome $W/b)" ZM092

# 2. Match first (held open), then void: the void waits, then is refused.
session "$W/c" "$MATCH '$T7'" 2 &
sleep 0.5
session "$W/d" "$VOID '$T7'" 0 &
wait
check "match then void (racing): match commits" "$(outcome $W/c)" ok
check "match then void (racing): void refused after waiting" "$(outcome $W/d)" ZM091

# 3. The app's filtered reconciliation save racing a void: it matches nothing.
session "$W/e" "$VOID '$T8'" 2 &
sleep 0.5
session "$W/f" "update financial_transactions set statement_reconciled = true where account_id = '$A' and voided = false and id in ('$T8')" 0 &
wait
check "void then app reconciliation save (racing): save matches nothing, no error" "$(outcome $W/f):$(sql "select statement_reconciled from financial_transactions where id = '$T8'")" "ok:f"

# 4-5. Rollback in each order: the waiting write proceeds against the
#      unchanged row once the first transaction rolls back.
session_rb() { # $1 out, $2 sql, $3 seconds to hold open, then ROLLBACK
  $PSQL -v VERBOSITY=verbose > "$1" 2>&1 <<SQL
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';
begin;
$2;
select pg_sleep($3);
rollback;
SQL
}
T12=c0000000-0000-0000-0000-000000000012; T13=c0000000-0000-0000-0000-000000000013
session_rb "$W/g" "$VOID '$T12'" 2 &
sleep 0.5
session "$W/h" "$MATCH '$T12'" 0 &
wait
check "void rolled back while a match waits: match then succeeds" "$(outcome $W/h):$(sql "select voided || ':' || statement_reconciled from financial_transactions where id = '$T12'")" "ok:false:true"
session_rb "$W/i" "$MATCH '$T13'" 2 &
sleep 0.5
session "$W/j" "$VOID '$T13'" 0 &
wait
check "match rolled back while a void waits: void then succeeds" "$(outcome $W/j):$(sql "select voided || ':' || statement_reconciled from financial_transactions where id = '$T13'")" "ok:true:false"

check "races: no entry ended voided and matched" \
  "$(sql "select count(*) from financial_transactions where id in ('$T6','$T7','$T8','$T12','$T13') and voided and statement_reconciled")" 0
