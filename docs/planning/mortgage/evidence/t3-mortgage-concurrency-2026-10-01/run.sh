#!/bin/bash
# T3 (2026-10-01): concurrent mortgage balance-update reproduction on live code c15733c.
#
#   ./run.sh [repo] [live|fixed]
#     repo   ZMR repository checkout (read-only use: `git archive c15733c supabase`); default below.
#     live   (default) the 110 migrations exactly as in live c15733c.
#     fixed  the same, plus candidate_fix_row_lock.sql (test-only control: FOR UPDATE on the row).
#
# Disposable local Postgres 17 only (initdb in a temp dir, 127.0.0.1, port $ZMR_T3_PGPORT or
# 55441, refused if busy). Fictional data. Never connects to Practice or production; reads no
# credentials; changes nothing in the repository. Everything is deleted on exit.
#
# Method: session A opens a transaction, performs one write, holds it for 2 s, commits.
# Session B starts 0.7 s later and performs its write in autocommit. Both run as role
# `authenticated` with a fictional owner's JWT subject, as PostgREST would.
set -u
EVID=$(cd "$(dirname "$0")" && pwd)
REPO=${1:-/Users/janki/Projects/ZMR-Real-Estate}
MODE=${2:-live}
PORT=${ZMR_T3_PGPORT:-55441}
LIVE=c15733c21c9f0a196c31c0f6e606b21ba64c5afd
PG=/opt/homebrew/opt/postgresql@17/bin
WORK=$(mktemp -d /tmp/zmr-t3-mortgage-race.XXXXXX)
T=$WORK/supabase/tests/entity_responsibility
cleanup() { $PG/pg_ctl -D $T/data stop -m fast >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT

git -C "$REPO" archive "$LIVE" supabase | tar -x -C "$WORK" || { echo "cannot read $LIVE from $REPO"; exit 2; }
EXTRA=(); [ "$MODE" = fixed ] && EXTRA=("$EVID/candidate_fix_row_lock.sql")
echo "== mode: $MODE   code: $LIVE   port: $PORT   $(date -u +%FT%TZ)"
ZMR_TEST_PGPORT=$PORT $T/build.sh "$WORK" ${EXTRA[@]+"${EXTRA[@]}"} || exit 2

PSQL="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -d zmr -X -q -t -A"
ACC=a0000000-0000-0000-0000-00000000000a
USR=aaaaaaaa-0000-0000-0000-00000000000a
PRE="set role authenticated; set request.jwt.claim.sub='$USR';"
$PSQL -c "insert into auth.users (id, email) values ('$USR','zmr-test-a@example.test');
insert into accounts (id, name) values ('$ACC','ZMR-TEST A');
insert into account_members (account_id, user_id, role) values ('$ACC','$USR','owner');" >/dev/null

# One fictional property + active mortgage per case: principal balance $2, escrow $3.
mk() {
  local p="a1000000-0000-0000-0000-0000000000$1"
  $PSQL -c "insert into properties (id, account_id, address) values ('$p','$ACC','$1 ZMR-TEST Race St');
  insert into mortgage_details (account_id, property_id, lender_name, original_loan_amount, current_balance, escrow_balance, interest_rate, monthly_payment, loan_start_date, term_years)
  values ('$ACC','$p','ZMR-TEST Bank',200000,$2,$3,6.5,1500,'2022-01-01',30);" >/dev/null
  echo "$p"
}
pay()   { echo "insert into mortgage_payments (account_id, property_id, payment_date, amount, principal_amount, interest_amount) values ('$ACC','$1','2026-10-01',$(( $2 + 10 )),$2,10)"; }
esc()   { echo "insert into mortgage_escrow_transactions (account_id, property_id, transaction_date, transaction_type, amount) values ('$ACC','$1','2026-10-01','$2',$3)"; }
edit()  { echo "update mortgage_details set current_balance = $2 where property_id = '$1' and not voided"; }
race() {  # A-statement, B-statement
  ( $PSQL -c "$PRE begin; $1; select pg_sleep(2); commit;" >/dev/null 2>$WORK/a.err ) &
  sleep 0.7
  $PSQL -c "$PRE $2" >/dev/null 2>$WORK/b.err
  wait
  ERRS="A:$(grep -oE 'ERROR: +[^(]{0,60}' $WORK/a.err | head -1 | sed 's/ERROR: *//') B:$(grep -oE 'ERROR: +[^(]{0,60}' $WORK/b.err | head -1 | sed 's/ERROR: *//')"
}
state() { $PSQL -c "select current_balance || ' / escrow ' || coalesce(escrow_balance::text,'null') from mortgage_details where property_id = '$1' and not voided"; }
ledger() { $PSQL -c "select 'payments=' || (select count(*) from mortgage_payments where property_id='$1') || ' escrow_rows=' || (select count(*) from mortgage_escrow_transactions where property_id='$1')"; }
FAILS=0
report() {  # case, property, correct-state, correct-ledger
  local got led; got=$(state "$2"); led=$(ledger "$2")
  local verdict="OK"; { [ "$got" = "$3" ] && [ "$led" = "$4" ]; } || { verdict="LOST/INCORRECT"; FAILS=$((FAILS+1)); }
  printf '%-58s correct: %-24s %-26s observed: %-24s %-26s %-15s | %s\n' "$1" "$3" "$4" "$got" "$led" "$verdict" "$ERRS"
}

P=$(mk 01 1000.00 100.00); race "$(pay $P 100)" "$(pay $P 50)"
report "C1 payment 100 || payment 50" $P "850.00 / escrow 100.00" "payments=2 escrow_rows=0"

P=$(mk 02 1000.00 100.00); race "$(esc $P deposit 30)" "$(esc $P deposit 20)"
report "C2 escrow deposit 30 || deposit 20" $P "1000.00 / escrow 150.00" "payments=0 escrow_rows=2"

P=$(mk 03 1000.00 100.00); race "$(esc $P disbursement 80)" "$(esc $P disbursement 80)"
report "C3 disbursement 80 || 80 (escrow 100; 2nd must be refused)" $P "1000.00 / escrow 20.00" "payments=0 escrow_rows=1"

P=$(mk 04 100.00 100.00); race "$(pay $P 80)" "$(pay $P 80)"
report "C4 principal 80 || 80 (balance 100; 2nd must be refused)" $P "20.00 / escrow 100.00" "payments=1 escrow_rows=0"

P=$(mk 05 1000.00 100.00); race "$(pay $P 100)" "$(esc $P deposit 30)"
report "C5 payment 100 || escrow deposit 30 (different columns)" $P "900.00 / escrow 130.00" "payments=1 escrow_rows=1"

P=$(mk 06 1000.00 100.00); race "$(edit $P 2000.00)" "$(pay $P 50)"
report "C6 manual edit to 2000 || then payment 50" $P "1950.00 / escrow 100.00" "payments=1 escrow_rows=0"

P=$(mk 07 1000.00 100.00); race "$(pay $P 100)" "$(edit $P 2000.00)"
report "C7 payment 100 || then manual edit to 2000 (absolute)" $P "2000.00 / escrow 100.00" "payments=1 escrow_rows=0"

echo "== RESULT ($MODE): $FAILS case(s) with a lost or incorrect balance"
